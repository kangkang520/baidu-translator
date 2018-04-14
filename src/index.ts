import fetch, { Body } from 'node-fetch'
import * as md5 from 'md5'
import * as path from 'path'
import * as fs from 'fs'
const config = require('./../res/config.json') || {}

const URL = 'http://api.fanyi.baidu.com/api/trans/vip/translate'


class BaiduTranslator {
	public static readonly translator = new BaiduTranslator()
	private constructor() { }

	//初始化
	public async init() {
		if (!this.appid) this.appid = await this.input('APPID')
		if (!this.key) this.key = await this.input('KEY')
	}

	//开始翻译
	public async translate(input: string) {
		let result = await this.callApi(input)
		switch (result.error_code) {
			case '52001':
				this.logError('请求超时')
				break
			case '52002':
				this.logError('系统错误')
				break
			case '52003':
				config.appid = undefined
				await this.init()
				await this.translate(input)
				break
			case '54000':
				this.logError('必填参数为空')
				break
			case '54001':
				config.key = undefined
				await this.init()
				await this.translate(input)
				break
			case '54003':
				this.logError('访问频率受限')
				break
			case '54004':
				this.logError('账户余额不足')
				break
			case '54005':
				this.logError('长query请求频繁')
				break
			case '58000':
				this.logError('当前IP不允许使用')
				break
			case '58001':
				this.logError('不支持的语言')
				break
			default:
				this.print(result)
				break
		}
	}

	//打印结果
	private print(result: any) {
		console.log(`\x1b[31m${result.trans_result[0].dst}\x1b[0m`)
	}

	//打印错误
	private logError(text: string) {
		console.log(`ERR:\x1b[31m${text}\x1b[0m`)
	}

	//获取APPID
	private get appid(): string {
		return config.appid || ''
	}

	//获取key
	private get key(): string {
		return config.key || ''
	}

	//设置appid
	private set appid(appid: string) {
		config.appid = appid
		fs.writeFileSync(path.join(__dirname, './../res/config.json'), JSON.stringify(config))
	}

	//设置key
	private set key(key: string) {
		config.key = key
		fs.writeFileSync(path.join(__dirname, './../res/config.json'), JSON.stringify(config))
	}

	private async input(tip: string, defaultVal?: string): Promise<string> {
		return new Promise<string>(resolve => {
			var tipText = defaultVal ? `${tip}(${defaultVal}):` : `${tip}:`
			process.stdout.write(tipText)
			process.stdin.once('data', d => {
				process.stdin.removeAllListeners('data')
				resolve((d + '').trim())
			})
		})
	}

	//调用API
	private async callApi(input: string) {
		return fetch(URL + '?' + this.makeBody(input)).then(res => res.json())
	}

	//构建body
	private makeBody(input: string): string {
		let salt = new Date().getTime()
		let from = 'auto'
		let to = 'auto'
		let sign = md5(this.appid + input + salt + this.key)
		let obj = { q: input, from, to, appid: this.appid, salt, sign }
		return Object.keys(obj).map(k => `${k}=${encodeURI((obj as any)[k])}`).join('&')
	}
}

async function main(words: Array<string>) {
	let translator = BaiduTranslator.translator
	await translator.init()
	await translator.translate(words.join(' '))
	process.exit(0)
}


main(process.argv.slice(2))