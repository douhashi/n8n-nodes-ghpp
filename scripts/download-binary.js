const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { execFileSync } = require('node:child_process');

const PLATFORM_MAP = { linux: 'linux', darwin: 'darwin' };
const ARCH_MAP = { x64: 'amd64', arm64: 'arm64' };
const SUPPORTED = [
	{ os: 'linux', arch: 'amd64' },
	{ os: 'linux', arch: 'arm64' },
	{ os: 'darwin', arch: 'arm64' },
];
const BASE_URL = 'https://github.com/douhashi/ghpp/releases/latest/download';
const MAX_REDIRECTS = 5;

/**
 * Returns the mapped { os, arch } for the current platform,
 * or null if the platform is unsupported.
 */
function getPlatformArch() {
	const mappedOS = PLATFORM_MAP[os.platform()];
	const mappedArch = ARCH_MAP[os.arch()];

	if (!mappedOS || !mappedArch) {
		return null;
	}

	const found = SUPPORTED.find((s) => s.os === mappedOS && s.arch === mappedArch);
	return found || null;
}

/**
 * Download a URL to a local file, following up to MAX_REDIRECTS redirects.
 * Returns a Promise that resolves when the download is complete.
 */
function download(url, dest, redirectCount = 0) {
	return new Promise((resolve, reject) => {
		if (redirectCount > MAX_REDIRECTS) {
			reject(new Error('Too many redirects'));
			return;
		}

		if (!url.startsWith('https://')) {
			reject(new Error(`Refusing non-HTTPS URL: ${url}`));
			return;
		}

		https
			.get(url, (res) => {
				if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					res.resume();
					download(res.headers.location, dest, redirectCount + 1)
						.then(resolve)
						.catch(reject);
					return;
				}

				if (res.statusCode !== 200) {
					res.resume();
					reject(new Error(`Download failed: HTTP ${res.statusCode}`));
					return;
				}

				const file = fs.createWriteStream(dest);
				res.pipe(file);
				file.on('finish', () => {
					file.close(resolve);
				});
				file.on('error', (err) => {
					fs.unlink(dest, () => {});
					reject(err);
				});
			})
			.on('error', (err) => {
				reject(err);
			});
	});
}

async function main() {
	const platformArch = getPlatformArch();

	if (!platformArch) {
		console.warn(
			`[ghpp] Unsupported platform: ${os.platform()} ${os.arch()}. Skipping binary download.`,
		);
		process.exit(0);
	}

	const binDir = path.join(__dirname, '..', 'bin');
	const binaryPath = path.join(binDir, 'ghpp');

	if (fs.existsSync(binaryPath)) {
		console.log('[ghpp] Binary already exists. Skipping download.');
		process.exit(0);
	}

	fs.mkdirSync(binDir, { recursive: true });

	const tarName = `ghpp_${platformArch.os}_${platformArch.arch}.tar.gz`;
	const url = `${BASE_URL}/${tarName}`;
	const tarPath = path.join(binDir, '.ghpp.tar.gz');

	console.log(`[ghpp] Downloading ${url} ...`);
	await download(url, tarPath);

	console.log('[ghpp] Extracting binary ...');
	execFileSync('tar', ['xzf', tarPath, '-C', binDir]);

	fs.chmodSync(binaryPath, 0o755);

	fs.unlinkSync(tarPath);

	console.log('[ghpp] Binary installed successfully.');
}

if (require.main === module) {
	main().catch((err) => {
		console.error(`[ghpp] Failed to download binary: ${err.message}`);
		process.exit(0);
	});
}

module.exports = { getPlatformArch, PLATFORM_MAP, ARCH_MAP, SUPPORTED };
