const http = require('http')
const path = require('path')
const fs = require('fs')

const server = http.createServer()
const port = 3099

server.on('request', (req, res) => {
  const {url,method} = req

  console.log("url is ", url)
  console.log("method is ", method)

  // 1.处理 /favicon.ico 请求
  if(url === '/favicon.ico' && method === 'GET') {
    res.writeHead(200,'Content-Type','text/plain;');
    res.end("have no favicon.ico")
  }

  // 2.处理 / 请求，获取 index 文件
  if(url === '/' && method === 'GET') {
    const pathfile = path.join(__dirname, 'index.html')
    // console.log(`pathfile is ${pathfile}`)

    fs.readFile(pathfile, (err, data) => {
      if(err) {
        res.writeHead(404,'Content-Type','text/plain;');
        res.write("Error 404");
        res.end();
      } else {
        res.writeHead(200,'Content-Type','text/html; charSet="utf8"');
        res.write(data);
        res.end();
      }
    })
  }



})

server.listen(port, () => {
  console.log(`server running at http://localhost:${port}`)
})
/*
// 判断上传的是文件
if(url === '/upload' && method === 'POST') {
  // 获取每段数据边界
  const bd = req.headers['content-type'].split('boundary=')[1]
  // 创建二进制缓冲区
  let bodyBuffer = Buffer.alloc(0)

  req.on('data', chunk => {
    bodyBuffer = Buffer.concat([bodyBuffer, chunk])   // 合并数据块
  })

  req.on('end', () => {
    // 将数据块变成字符串后根据边界拆分成数组
    // console.log(bodyBuffer)
    let filename, fileDate, fdata, file_name
    const parts = bodyBuffer.toString().split(`--${bd}`)

    // 新的写法：处理每条数据
    parts.forEach(part => {
      // 这一步的判断很总要，能排除非表单数据(如 null)
      if(part.includes("Content-Disposition: form-data;")) {

        if(part.includes('filename="')) {
          console.log(part.split("\r\n\r\n")[0])
          file_name = part.match(/filename="(.+?)"/)[1]
        }

        const fname = part.match(/name="(.+?)"/)[1]
        const fvalue = part.split("\r\n\r\n")[1].replace('\r\n$', '')

        switch(fname) {
        case "filename":
          filename = fvalue
          break
        case "fileDate":
          fileDate = fvalue
          break
        case "files":
          fdata = Buffer.from(fvalue)
        }
      }
    })

    if(!file_name) {
      console.log(`文件名获取不到`)
      res.writeHead(500)
      res.end(JSON.stringify("上传失败"))        
    } else {
    // 设置存储路径
      const filePath = path.join(__dirname, 'upload', file_name)
    // 同步写文件到本地
      fs.writeFileSync(filePath, fdata)
    // 这里返回到 req.on('end',() => {})
      res.writeHead(200, {'Content-Type': 'application/json'})
      res.end(JSON.stringify("上传成功"))
      return
    }
  })
}
*/