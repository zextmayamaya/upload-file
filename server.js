const http = require('http')
const fs = require('fs')
const path = require('path')
const Url = require('url')
const port = 3020					// 定义端口变量


const server = http.createServer((req, res) => {
	const {url, method} = req
	const root = path.resolve(__dirname)

	console.log(`[${new Date().toISOString()}] ${method} ${url}`)

	// 设置常用头信息
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

	// 处理 /favicon.ico
	if(method === 'GET' && url === '/favicon.ico') {
		res.writeHead(200)
		res.end()
		return
	}

	// 处理 OPTINOS 请求
	if(method === 'OPTIONS') {
		res.writeHead(200)
		res.end()
		return
	}


	// 获取响应页面 uploadfile.html
	if(method === 'GET' && url === '/uploadfile') {
		const index = path.join(root, 'uploadfile.html')
		// 创建读取文件流
		const reader = fs.createReadStream(index)

		res.writeHead(200, {'Content-Type': 'text/html'})
		reader.pipe(res)
		reader.on('error', err => console.error('读取文件失败', err.message))
		return
	}

	// 接收分段上传的大文件
	if(method === 'POST' && url === '/upload') {
		// 获得边界的二进制
		const contentType = req.headers['content-type'] || ""
		const bdy = contentType.match(/boundary=(.+)$/)

		if(!bdy) {
			res.statusCode = 400
			res.end("content-type 中丢失了边界！")
			return
		}

		const bd = Buffer.from('--' + bdy[1])
		let rawData = Buffer.alloc(0)

		req.on('data', chunk => {
			rawData = Buffer.concat([rawData, chunk])
		})

		req.on('end', () => {
			let startIndex = 0,index
			let filename,fileindex,filebody
			const parts = []

			// 从数据块中分隔出不同的字段部分
			while((index = rawData.indexOf(bd, startIndex)) !== -1) {
				const part = rawData.slice(startIndex, index)

				if(part.length > 0) {
					parts.push(part)
				}

				startIndex = index + bd.length
			}

			// 获取字段的键与值
			parts.forEach(item => {
				const end = item.indexOf('\r\n\r\n')
				const head = item.slice(0, end).toString()
				const key = head.match(/name="(.+?)"/)[1]
				const value = item.slice(end + 4, item.length - 2)

				switch(key) {
				case 'name':
					filename = value.toString()
					break
				case 'index':
					fileindex = value.toString()
					break
				case 'file':
					filebody = value
				}
			})

			// 创建目录
			if(!fs.existsSync('upload')) {
				fs.mkdirSync('upload')
			}

			// 创建写入文件流
			const writer = fs.createWriteStream("upload/" + filename + "." + fileindex)

			// 写入文件
			writer.write(filebody)
			writer.end(() => {
				res.writeHead(200, {'Content-Type': 'text/plain'})
				res.end(`chunk has received ${fileindex}`)
			})
		})
		return
	}

	// 合并大文件的多个块
	if(method === 'POST' && url === '/upload/combine') {
		let body = ''

		req.on('data', chunk => body += chunk)

		req.on('end', () => {
			const filename = JSON.parse(body)

			// 筛选出指定名称的文件块
			fs.readdir('upload', (err, files) => {
				if(err) {
					console.log(err)
					return
				}

				// 按照文件的索引值排序
				const chunks = files.filter(file => file.startsWith(filename.name))
				.sort((a,b) => {
					const aIndex = parseInt(a.split('.').pop())
					const bIndex = parseInt(b.split('.').pop())
					return aIndex - bIndex
				})

				const filepath = path.join('upload', filename.name)

				// 同步执行写入
				chunks.forEach(item => {
					const chunkpath = path.join('upload', item)
					const data = fs.readFileSync(chunkpath)
					fs.appendFileSync(filepath, data)
					fs.unlinkSync(chunkpath)
				})
				res.statusCode = 200
				res.setHeader('Content-Type', 'text/plain; charset=utf8')
				res.end("上传完毕")
			})

		})
		return
	}

	// 获取文件列表
	const urlObj = Url.parse(url)
    // console.log("url object parse:",urlObj)
	const pathObj = path.parse(urlObj.pathname)
	if(method === 'GET' && url === '/filelist') {
		const filedir = path.join(root, 'upload')

		// 获取文件列表
		fs.readdir(filedir, (err, files) => {
			if(err) {
				res.statusCode = 500
				return res.end('目录读取错误')
			}

			if(!files.length) {
				res.statusCode = 200
				res.end("文件列表为空！")
			} else {
				res.statusCode = 200
				res.write('<ul>')

				files.forEach(file => {
					const name = file
					const link = path.join('upload', file)
					res.write(`<li><a href="${link}" target="_blank">${name}</a></li>`)
				})

				res.end('</ul>')
			}
		})
		return
	}

	// 下载列表中的文件
	if(method === 'GET' && pathObj.dir === '/upload') {
		const filePath = path.join(root, urlObj.pathname)

		;(async function (filelink) {
			// 这里对文件名进行解码，因为中文文件只有被解码后才能识别
			const file = decodeURIComponent(filelink)
			res.statusCode = 200

			try {
				const stats = await fs.promises.stat(file)
				if(stats.isFile) {
					const readStream = fs.createReadStream(file)

					readStream.pipe(res)
				}

			} catch (err) {
				if(err.code === 'ENOENT') {
					console.log("文件不存在")
					res.end()
				} else {
					console.log("读取文件错误", err)
					res.end()
				}
				return
			}

		})(filePath);
		return
	}

	// 删除全部文件
	if(method === 'GET' && url === '/delete') {
		const folder = path.join('upload')
		// console.log(folder)
		fs.rmSync(folder, {recursive: true, force: true})
		fs.mkdirSync(folder)
		res.writeHead(200)
		res.end("文件已删除")
		return
	}

	// 访问默认页面 index.html
	if(method === 'GET' && url === '/') {
		const index = path.join(root, 'index.html')
		// 创建读取文件流
		const reader = fs.createReadStream(index)

		res.writeHead(200, {'Content-Type': 'text/html'})
		reader.pipe(res)
		reader.on('error', err => console.error('读取文件失败', err.message))
		return
	}


})

server.listen(port, '0.0.0.0', () => {
	console.log(`server running at port ${port}`)
})
