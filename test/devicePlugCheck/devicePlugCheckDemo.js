/*
*  Write by chrou 2019/1/9
*/
'use strict'
let constraints = []
let audioinputVal
let audioinputLable
let audiooutputVal
let audiooutputLable
let videoinputVal
let videoinputLable

const videoElement = document.querySelector('video')
const audioInputSelect = document.querySelector('select#audioSource')
const audioOutputSelect = document.querySelector('select#audioOutput')
const videoSelect = document.querySelector('select#videoSource')
const openCamera = document.querySelector('button#start')
const closeCamera = document.querySelector('button#stop')

videoSelect.onchange = start
audioInputSelect.onchange = start
audioOutputSelect.onchange = changeAudioDestination
openCamera.onclick = start
closeCamera.onclick = close

audioOutputSelect.disabled = !('sinkId' in HTMLMediaElement.prototype)

/***
 * 设置设备的下拉列表
 * @param devicesArray
 */
function setSelectLists (devicesArray) {
  // avoid select-value repeat
  audioInputSelect.options.length = 0
  audioOutputSelect.options.length = 0
  videoSelect.options.length = 0

  for (let i = 0; i < devicesArray.length; i++) {
    let deviceInfo = devicesArray[i]
    const option = document.createElement('option')
    option.value = deviceInfo.deviceId
    switch (deviceInfo.kind) {
      case 'audioinput':
        option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`
        audioInputSelect.appendChild(option)
        break
      case 'audiooutput':
        option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`
        audioOutputSelect.appendChild(option)
        break
      case 'videoinput':
        option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`
        videoSelect.appendChild(option)
        break
      default:
        console.log('Some other kind of source/device: ', deviceInfo)
    }
  }
  setFirstOptionSelect()
}

/***
 * Set default selections
 */
function setFirstOptionSelect () {
  if (audioInputSelect.options[0]) {
    audioInputSelect.options[0].selected = true
  }
  if (audioOutputSelect.options[0]) {
    audioOutputSelect.options[0].selected = true
  }
  if (videoSelect.options[0]) {
    videoSelect.options[0].selected = true
  }
}

/***
 * Attach audio output device to video element using device/sink ID.
 * @param element
 * @param sinkId
 */
function attachSinkId (element, sinkId) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
      .then(() => {
        console.log(`Success, audio output device attached: ${sinkId}`)

        if (audioOutputSelect.value) {
          deviceApply()
        }
      })
      .catch(error => {
        let errorMessage = error
        if (error.name === 'SecurityError') {
          errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`
        }
        console.error(errorMessage)
        // Jump back to first output device in the list as it's the default.
        audioOutputSelect.selectedIndex = 0
      })
  } else {
    console.warn('Browser does not support output device selection.')
  }
}

/***
 * 改变音频输出设备
 */
function changeAudioDestination () {
  const audioDestination = audioOutputSelect.value
  attachSinkId(videoElement, audioDestination)
}

/***
 * 取流成功
 * @param stream
 */
function gotStream (stream) {
  window.stream = stream // make stream available to console
  if ('srcObject' in videoElement) {
    videoElement.srcObject = stream
  } else {
    // 防止在新的浏览器里使用它，应为它已经不再支持了
    videoElement.src = window.URL.createObjectURL(stream)
  }
}

function handleError (error) {
  console.warn('navigator.getUserMedia error: ', error)
}

/***
 * 取流
 */
function start () {
  const audioSource = audioInputSelect.value
  const videoSource = videoSelect.value
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop()
    })
  }
  constraints = {
    audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
    video: { deviceId: videoSource ? { exact: videoSource } : undefined }
  }
  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(handleError)
  deviceApply()
}

/***
 * 改变device的使用状态
 */
function deviceApply () {
  audioinputVal = audioInputSelect.options[audioInputSelect.options.selectedIndex].value
  audioinputLable = audioInputSelect.options[audioInputSelect.options.selectedIndex].label
  audiooutputVal = audioOutputSelect.options[audioOutputSelect.options.selectedIndex].value
  audiooutputLable = audioOutputSelect.options[audioOutputSelect.options.selectedIndex].label
  videoinputVal = videoSelect.options[videoSelect.options.selectedIndex].value
  videoinputLable = videoSelect.options[videoSelect.options.selectedIndex].label

  let devices = {
    audioinput: {
      deviceId: audioinputVal,
      label: audioinputLable
    },
    audiooutput: {
      deviceId: audiooutputVal,
      label: audiooutputLable
    },
    videoinput: {
      deviceId: videoinputVal,
      label: videoinputLable
    }
  }
  MediaDevice.prototype.setDeviceState(true, devices)
}

/***
 * 停止取流
 */
function close () {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop()
    })
  }
  MediaDevice.prototype.setDeviceState(false)
}

setTimeout(function () {
  let devicesArray = MediaDevice.prototype.getMediaDevice()
  setSelectLists(devicesArray)
}, 3000)
