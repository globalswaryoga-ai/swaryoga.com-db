// jest.setup.js
import '@testing-library/jest-dom'

// Polyfills for tests that run in JSDOM but rely on Node/Web APIs.
// - Some dependencies (mongoose/whatwg-url) require TextEncoder.
// - Some utilities import Next's Request/Response which expect Fetch APIs.
import { TextDecoder, TextEncoder } from 'util'

if (!global.TextEncoder) {
	global.TextEncoder = TextEncoder
}

if (!global.TextDecoder) {
	global.TextDecoder = TextDecoder
}

// Prefer Node 18+ built-in fetch; fall back to undici if needed.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const undici = (() => {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		return require('undici')
	} catch {
		return null
	}
})()

if (!global.fetch) {
	if (undici?.fetch) {
		global.fetch = undici.fetch
		global.Headers = undici.Headers
		global.Request = undici.Request
		global.Response = undici.Response
	}
}

// Ensure Request/Response are available even if fetch exists.
if (!global.Request && undici?.Request) global.Request = undici.Request
if (!global.Response && undici?.Response) global.Response = undici.Response
if (!global.Headers && undici?.Headers) global.Headers = undici.Headers
