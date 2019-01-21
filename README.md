# How to build your own environment

## 一、安装

```
   npm install
```
注意：运行以上命令的前提是已经安装了 [Node.js](https://nodejs.org/en/) 和 [npm](https://www.npmjs.com/) 。

## 二、使用

### standard 

#### 检查所有文件
```
$ standard
Error: Use JavaScript Standard Style
  lib/torrent.js:950:11: Expected '===' and instead saw '=='.
```

可以跟上 glob 形式的路径参数，但记得带引号以确保 standard 工具正确解析，否则会被命令行解析。

```
$ standard "src/util/**/*.js" "test/**/*.js"
```
注意： standard 默认查找 **/*.js, **/*.jsx 所匹配到的文件。

然后运行以下命令来检查 markdown 文件代码块中的代码：
```
$ standard --plugin markdown '**/*.md'
```

然后运行以下命令来检查包含在 script 标签中的代码：

```
$ standard --plugin html '**/*.html'
```

#### 自动格式化
```
standard --fix
```

#### 美化输出
```
$ standard --verbose | snazzy
```


### 代码提交检查 -- git commit

npm install 安装完成后，提交代码会进行检查：
```
git commit -m "commit message"
```
注意：如果你安装后发现不起作用，很可能是没有安装在全局，无法找到依赖项，你可以尝试`npm install -g`来解决这个问题。


## FAQ

1、The list of acquired devices contains the device being pulled out，can not solve.


## 参考

[关于Standard - JavaScript 代码规范风格检查，你可以看这里](https://standardjs.com/readme-zhcn.html)






