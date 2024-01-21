export function getId(str?: string) {
	return String(str)
		.trim()
		.replace(/[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~’]+/g, '-')
		.replace(/(^-+|-+$)/g, '')
		.toLowerCase()
}
