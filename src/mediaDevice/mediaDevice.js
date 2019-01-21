/*
*  Write 2019/1/9
*/
'use strict'
let globalVar = {
  mediaDevice: {
    audioOutputDevices: [],
    audioInputDevices: [],
    videoInputDevices: [],
    usingDevices: [],
    screenResolution: []
  }
}
let audioOutputDevices = globalVar.mediaDevice.audioOutputDevices
let audioInputDevices = globalVar.mediaDevice.audioInputDevices
let videoInputDevices = globalVar.mediaDevice.videoInputDevices
let usingDevices = globalVar.mediaDevice.usingDevices
let screenResolution = globalVar.mediaDevice.screenResolution

/* 媒体设备热插拔检测定时器 */
let oCheckDeviceTimer

let video = document.createElement('video') // where we will put & demo our video output
let stream
let cameraScanList = [] // used to hold a camera's ID and other parameters
let scanList // holder for our demo results
let index = 0 // used for iterating through the array
let camNum = 0 // used for iterating through number of camera
let scanning = false // variable to show if we are in the middle of a scan
let resolution = []

const quickScanList = [
  {
    'label': '4K(UHD)',
    'width': 3840,
    'height': 2160,
    'ratio': '16:9'
  },
  {
    'label': '1080p(FHD)',
    'width': 1920,
    'height': 1080,
    'ratio': '16:9'
  },
  {
    'label': 'UXGA',
    'width': 1600,
    'height': 1200,
    'ratio': '4:3'
  },
  {
    'label': '720p(HD)',
    'width': 1280,
    'height': 720,
    'ratio': '16:9'
  },
  {
    'label': 'SVGA',
    'width': 800,
    'height': 600,
    'ratio': '4:3'
  },
  {
    'label': 'VGA',
    'width': 640,
    'height': 480,
    'ratio': '4:3'
  },
  {
    'label': '360p(nHD)',
    'width': 640,
    'height': 360,
    'ratio': '16:9'
  },
  {
    'label': 'CIF',
    'width': 352,
    'height': 288,
    'ratio': '4:3'
  },
  {
    'label': 'QVGA',
    'width': 320,
    'height': 240,
    'ratio': '4:3'
  },
  {
    'label': 'QCIF',
    'width': 176,
    'height': 144,
    'ratio': '4:3'
  },
  {
    'label': 'QQVGA',
    'width': 160,
    'height': 120,
    'ratio': '4:3'
  }
]

class MediaDevice {
  /***
   *  检查设备是否已存在
   *  @param  deviceArray  检查的设备数组
   *  @param  device  检查的设备
   *  @returns  {number}  不存在：-1，  存在：非-1
   */
  indexOfArray (deviceArray, device) {
    let index = -1
    if (deviceArray) {
      for (let i = 0; i < deviceArray.length; i++) {
        if (deviceArray[i].deviceId === device.deviceId && deviceArray[i].kind === device.kind) {
          if (device.label !== '') {
            deviceArray[i] = device
          }
          index = i
          break
        }
      }
    }

    return index
  }

  /***
   *  修复windows下firefox的bug:  存在两个重复的枚举设备，没有default
   *  @param  devices  所有设备
   *  @returns  {Array}  不重复的设备数组
   */
  deleteDeduplicateDevice (devices) {
    let deviceArr = []
    for (let i = 0; i < devices.length; i++) {
      if (MediaDevice.prototype.indexOfArray(deviceArr, devices[i]) < 0) {
        deviceArr.push(devices[i])
      }
    }
    return deviceArr
  }

  /***
   * 设置属性可枚举性
   * @param device
   */
  static objDefineProperty (device) {
    let obj = {}
    Object.defineProperty(obj, 'deviceId', {
      value: device.deviceId,
      enumerable: true,
      writable: true
    })
    Object.defineProperty(obj, 'groupId', {
      value: device.groupId,
      enumerable: true,
      writable: true
    })
    Object.defineProperty(obj, 'kind', {
      value: device.kind,
      enumerable: true,
      writable: true
    })
    Object.defineProperty(obj, 'label', {
      value: device.label,
      enumerable: true,
      writable: true
    })
    Object.defineProperty(obj, 'state', {
      value: 'available',
      enumerable: true,
      writable: true
    })
    if (device.kind === 'videoinput') {
      Object.defineProperty(obj, 'resolution', {
        value: [],
        enumerable: true,
        writable: true
      })
    }
    return obj
  }

  /***
   *  设备插入
   *  @param  newDevicesArray：音频输入数组、音频输出数组、视频输入数组
   */
  deviceInsert (newDevicesArray) {
    let index = -1
    let deviceArray = []
    newDevicesArray.forEach(function (device) {
      switch (device.kind) {
        case 'audioinput':
          deviceArray = audioInputDevices || []
          break
        case 'audiooutput':
          deviceArray = audioOutputDevices || []
          break
        case 'videoinput':
          deviceArray = videoInputDevices || []
          break
        default:
          console.log('Some other kind of source/device plug in: ', device)
      }
      index = MediaDevice.prototype.indexOfArray(deviceArray, device)
      if (index >= 0) {
        deviceArray[index].state = 'available'
        console.log('change device state to available')
      } else {
        let obj = MediaDevice.objDefineProperty(device)
        if (device.kind === 'videoinput') {
          cameraScanList.push(obj)
        }
        deviceArray.push(obj)
        // deviceArray[deviceArray.length - 1].state = 'available'
        console.log(device.label, ' has been plug in ', '(' + device.kind + ')')
      }
    })
  }

  /***
   *  设备拔出
   *  @param  newDevicesArray  本次获取的所有设备
   *  @param  oldDevicesArray  上一次保存的所有设备
   */
  devicePullout (newDevicesArray, oldDevicesArray) {
    let usingDevices = globalVar.mediaDevice.usingDevices
    if (newDevicesArray.length === 0) {
      oldDevicesArray.forEach(function (device) {
        device.state = 'unavailable'
      })
      console.warn('Have no device in conference!')
      return
    }
    oldDevicesArray.forEach(function (deviceItem) {
      let index = MediaDevice.prototype.indexOfArray(newDevicesArray, deviceItem)
      let usingIndex = MediaDevice.prototype.indexOfArray(usingDevices, deviceItem)
      if (index < 0) {
        deviceItem.state = 'unavailable'
        console.warn(deviceItem.label + '(' + deviceItem.deviceId + ') has been plug out! (' + deviceItem.kind + ')')
        // Fixed : The list of devices obtained by enumerateDevices is inaccurate, The device just pulled out still gets
        if (usingIndex > 0) {
          console.log('using device has been pull out ! Stop video sharing !!')
          usingDevices.splice(usingIndex, 1)
        }
      }
    })
  }

  /***
   * 从 localStorage 获取媒体设备列表
   * @returns {Array}
   */
  static getMediaDeviceFromStorage () {
    let devices = JSON.parse(localStorage.getItem('mediaDevice'))
    console.warn(devices)
    let mediaDeviceList = []
    if (devices) {
      if (audioInputDevices && audioInputDevices.length > 0) {
        audioInputDevices = devices.audioInputDevices
        mediaDeviceList = mediaDeviceList.concat(audioInputDevices)
      }
      if (audioOutputDevices && audioOutputDevices.length > 0) {
        audioOutputDevices = devices.audioOutputDevices
        mediaDeviceList = mediaDeviceList.concat(audioOutputDevices)
      }
      if (videoInputDevices && videoInputDevices.length > 0) {
        videoInputDevices = devices.videoInputDevices
        mediaDeviceList = mediaDeviceList.concat(videoInputDevices)
      }
    }
    return mediaDeviceList
  }

  /***
   *  成功获取设备列表
   *  @param  devices  获取的设备列表
   */
  gotDevicesSuccess (devices) {
    let newDevicesArray = MediaDevice.prototype.deleteDeduplicateDevice(devices)
    let oldDevicesArray = MediaDevice.getMediaDeviceFromStorage()
    let result = newDevicesArray.length - oldDevicesArray.length
    if (result >= 0) {
      MediaDevice.prototype.deviceInsert(newDevicesArray)
    } else {
      MediaDevice.prototype.devicePullout(newDevicesArray, oldDevicesArray)
    }
    MediaDevice.resolutionScan()
  }

  /***
   *  获取设备失败回调
   *  @param  error
   */
  errorCallback (error) {
    console.error('enumerateDevices error!')
    console.error(error)
  }

  /***
   *  enumerateDevices获取设备列表
   */
  getMediaDeviceList () {
    try {
      if ((navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) || adapter.browserDetails.isWebRTCPluginInstalled === true) {
        navigator.mediaDevices.enumerateDevices()
          .then(MediaDevice.prototype.gotDevicesSuccess)
          .catch(MediaDevice.prototype.errorCallback)
      }
    } catch (e) {
      MediaDevice.prototype.errorCallback(e)
    }
  }

  /***
   *  获取设备能力
   */
  static resolutionScan () {
    if (cameraScanList && cameraScanList.length > 0) {
      console.log('Begin Quick Scan for camera resolution', cameraScanList)
      scanList = quickScanList
      scanning = true
      MediaDevice.prototype.streamRefresh(scanList[index], cameraScanList[0])
    }

    if (!screenResolution || screenResolution.length === 0) {
      let obj = {}
      let screenRes = window.screen
      Object.defineProperty(obj, 'height', {
        value: screenRes.height,
        enumerable: true
      })
      Object.defineProperty(obj, 'width', {
        value: screenRes.width,
        enumerable: true
      })
      screenResolution.push(obj)
    }
  }

  /***
   *  取流
   *  @param  resolutionInfo：取流的width、height  ect.信息
   *  @param  deviceInfo  扫描的设备
   */
  streamRefresh (resolutionInfo, deviceInfo) {
    let localVideoTrack = null
    if (window.stream) {
      localVideoTrack = window.stream.getVideoTracks()[0]
    }
    if (localVideoTrack && localVideoTrack.applyConstraints) {
      this.applyConstraints(resolutionInfo)
    } else {
      this.gum(resolutionInfo, deviceInfo)
    }
  }

  applyConstraints (resolutionInfo) {
    let localVideoTrack = window.stream.getVideoTracks()[0]
    let constraintForApply = {
      frameRate: { max: 30 },
      width: {
        ideal: resolutionInfo.width,
        max: resolutionInfo.width
      },
      height: {
        ideal: resolutionInfo.height,
        max: resolutionInfo.height
      }
    }
    localVideoTrack.applyConstraints(constraintForApply).then(function () {
      console.log('applyConstraints success')
      MediaDevice.prototype.captureResults('pass')
    }).catch(function (error) {
      console.warn('applyConstraints error: ', error.name)
      if (scanning) {
        MediaDevice.prototype.captureResults('fail: ' + error.name)
      }
    })
  }

  gum (resolutionInfo, deviceInfo) {
    // Kill any running streams;
    if (stream) {
      window.stream.getTracks().forEach(track => {
        track.stop()
      })
    }
    let constraints = {
      audio: false,
      video: {
        deviceId: deviceInfo.deviceId ? { exact: deviceInfo.deviceId } : undefined,
        frameRate: { max: 30 },
        width: {
          ideal: resolutionInfo.width,
          max: resolutionInfo.width
        },
        height: {
          ideal: resolutionInfo.height,
          max: resolutionInfo.height
        }
      }
    }
    function gotStream (mediaStream) {
      // change the video dimensions
      console.log('Display size for ' + resolutionInfo.label + ': ' + resolutionInfo.width + 'x' + resolutionInfo.height)
      video.width = resolutionInfo.width
      video.height = resolutionInfo.height
      window.stream = mediaStream
      video.srcObject = mediaStream
    }
    function errorCallback (error) {
      console.log('getUserMedia error!', error.name)
      if (scanning) {
        MediaDevice.prototype.captureResults('fail: ' + error.name)
      }
    }
    setTimeout(() => {
      navigator.mediaDevices.getUserMedia(constraints)
        .then(gotStream)
        .catch(errorCallback)
    }, (stream ? 200 : 0)) // official examples had MediaDevice.prototype at 200

    video.onloadedmetadata = MediaDevice.prototype.displayVideoDimensions
  }

  /***
   *  显示获取的视频流尺寸
   */
  displayVideoDimensions () {
    if (scanning) {
      // MediaDevice.prototype should only happen during setup
      if (scanList === undefined) {
        return
      }
      // Wait for dimensions if they don't show right away
      if (!video.videoWidth) {
        setTimeout(MediaDevice.prototype.displayVideoDimensions, 500) // was 500
      }
      if (video.videoWidth * video.videoHeight > 0) {
        if (scanList[index].width + 'x' + scanList[index].height !== video.videoWidth + 'x' + video.videoHeight) {
          MediaDevice.prototype.captureResults('fail: mismatch')
        } else {
          MediaDevice.prototype.captureResults('pass')
        }
      }
    }
  }

  /***
   *  保存扫描结果
   *  @param  status
   */
  captureResults (status) {
    console.log(scanList[index].label + ' Actual res ' + video.videoWidth + 'x' + video.videoHeight)
    if (!scanning) { // exit if scan is not active
      return
    }
    MediaDevice.prototype.resolutionDisplayTable(scanList, status)
    let cameraResolution = {}
    cameraResolution.label = cameraScanList[camNum].label
    cameraResolution.ResName = scanList[index].label
    cameraResolution.Ratio = scanList[index].ratio
    cameraResolution.ask = scanList[index].width + 'x' + scanList[index].height
    cameraResolution.status = scanList[index].status
    resolution.push(cameraResolution)

    index++
    if (index < scanList.length) { // go to the next scanList
      MediaDevice.prototype.streamRefresh(scanList[index], cameraScanList[camNum])
    } else if (camNum < cameraScanList.length - 1) { // move on to the next camera
      console.warn('move on to the next camera')
      camNum++
      index = 0
      MediaDevice.prototype.streamRefresh(scanList[index], cameraScanList[camNum])
    } else { // finish up
      if (window.stream) {
        window.stream.getTracks().forEach(track => {
          track.stop()
        })
      }
      cameraScanList = []
      scanning = false
      MediaDevice.setMediaDeviceToStorage()
      console.warn('finish up, stop stream')
      video.removeEventListener('onloadedmetadata', MediaDevice.prototype.displayVideoDimensions) // turn off the event handler
    }
    // set device resolution when any one of camera finish scan
    if (index === scanList.length - 1) {
      cameraScanList[camNum].resolution = resolution
      resolution = []
    }
  }

  /***
   *  设置本地存储
   */
  static setMediaDeviceToStorage () {
    console.log('set  localStorage')
    if (!window.localStorage) {
      console.warn('browser  is  not  support  localstorage')
      return false
    } else {
      localStorage.setItem('mediaDevice', JSON.stringify(globalVar.mediaDevice, null, '    '))
    }
  }

  /***
   *  设置显示结果的列表
   *  @param scanList
   *  @param  status  扫描结果
   */
  resolutionDisplayTable (scanList, status) {
    scanList[index].status = status
    scanList[index].streamWidth = video.videoWidth
    scanList[index].streamHeight = video.videoHeight

    let row = document.getElementById('results').insertRow(-1)
    let browserVer = row.insertCell(0)
    let deviceName = row.insertCell(1)
    let label = row.insertCell(2)
    let ratio = row.insertCell(3)
    let ask = row.insertCell(4)
    let statusCell = row.insertCell(5)

    browserVer.innerHTML = adapter.browserDetails.browser + ' ' + adapter.browserDetails.version
    deviceName.innerHTML = cameraScanList[camNum].label
    label.innerHTML = scanList[index].label
    ratio.innerHTML = scanList[index].ratio
    ask.innerHTML = scanList[index].width + 'x' + scanList[index].height
    statusCell.innerHTML = scanList[index].status
  }
}

/***
 *  设置设备的状态  apply:正在使用  available:可用  unavailable:不可用
 *  *  @param  isApply  使用：true,  不使用：false
 */
MediaDevice.prototype.setDeviceState = function (isApply, data) {
  if (isApply && data) {
    if (data.audioinput) {
      setState(audioInputDevices, data.audioinput)
    }
    if (data.audiooutput) {
      setState(audioOutputDevices, data.audiooutput)
    }
    if (data.videoinput) {
      setState(videoInputDevices, data.videoinput)
    }
  } else {
    usingDevices.length = 0
  }

  function setState (deviceArray, nowUseDevice) {
    if (!nowUseDevice || !nowUseDevice.deviceId || !nowUseDevice.label) {
      return
    }
    deviceArray.forEach(function (device) {
      let index = MediaDevice.prototype.indexOfArray(usingDevices, device)
      if (device.deviceId === nowUseDevice.deviceId && device.label === nowUseDevice.label) {
        if (index >= 0) {
          usingDevices[index].state = 'apply'
        } else {
          device.state = 'apply'
          usingDevices.push(device)
        }
        console.warn(device.label + '(' + device.deviceId + ') has been apply! (' + device.kind + ')')
      } else {
        if (index >= 0) {
          usingDevices.splice(index, 1)
        }
        device.state = 'available'
      }
    })
  }
}

/**
 * 媒体设备热插拔检查的开关
 *
 * setOrClear: 其中'set'表示启动，'clear'表示关闭
 * @param setOrClear
 */
MediaDevice.prototype.deviceCheckInterval = function (setOrClear) {
  MediaDevice.prototype.getMediaDeviceList()

  if (setOrClear === 'set') {
    // fire timer to check available devices
    if (oCheckDeviceTimer === null || oCheckDeviceTimer === undefined) {
      console.warn('deviceCheckInterval(set). ')
      if (adapter.browserDetails.browser === 'safari' && adapter.browserDetails.isWebRTCPluginInstalled === false) { // 入会后才检测到外接设备
        oCheckDeviceTimer = setInterval(
          function () { MediaDevice.prototype.getMediaDeviceList() }, 1000
        )
      } else {
        oCheckDeviceTimer = setInterval(
          function () { MediaDevice.prototype.getMediaDeviceList() }, 3 * 1000
        )
      }
    }
  } else if (setOrClear === 'clear') {
    if (oCheckDeviceTimer) {
      console.warn('deviceCheckInterval(clear). ')
      clearInterval(oCheckDeviceTimer)
      oCheckDeviceTimer = null
    }
  }
}

// /***
//  *  设备热拔插监听函数
//  *  @param  event  事件参数
//  */
// navigator.mediaDevices.ondevicechange = function (event) {
//   MediaDevice.prototype.getMediaDeviceList()
// }

/***
 * 获取设备列表
 * @returns {*[]}
 */
MediaDevice.prototype.getMediaDevice = function () {
  let devices = audioInputDevices.concat(audioOutputDevices.concat(videoInputDevices))
  return devices
}

/***
 * 设备热拔插定时检查器
 */
MediaDevice.prototype.deviceCheckInterval('set')
// MediaDevice.prototype.getMediaDeviceList()
