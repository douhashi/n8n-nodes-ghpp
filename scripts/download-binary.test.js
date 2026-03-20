const os = require('node:os');
const { getPlatformArch, PLATFORM_MAP, ARCH_MAP, SUPPORTED } = require('./download-binary');

describe('download-binary', () => {
	describe('getPlatformArch', () => {
		let platformSpy;
		let archSpy;

		beforeEach(() => {
			platformSpy = vi.spyOn(os, 'platform');
			archSpy = vi.spyOn(os, 'arch');
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should return correct mapping for linux x64', () => {
			platformSpy.mockReturnValue('linux');
			archSpy.mockReturnValue('x64');

			const result = getPlatformArch();
			expect(result).toEqual({ os: 'linux', arch: 'amd64' });
		});

		it('should return correct mapping for linux arm64', () => {
			platformSpy.mockReturnValue('linux');
			archSpy.mockReturnValue('arm64');

			const result = getPlatformArch();
			expect(result).toEqual({ os: 'linux', arch: 'arm64' });
		});

		it('should return correct mapping for darwin arm64', () => {
			platformSpy.mockReturnValue('darwin');
			archSpy.mockReturnValue('arm64');

			const result = getPlatformArch();
			expect(result).toEqual({ os: 'darwin', arch: 'arm64' });
		});

		it('should return null for unsupported darwin x64', () => {
			platformSpy.mockReturnValue('darwin');
			archSpy.mockReturnValue('x64');

			const result = getPlatformArch();
			expect(result).toBeNull();
		});

		it('should return null for unsupported platform (win32)', () => {
			platformSpy.mockReturnValue('win32');
			archSpy.mockReturnValue('x64');

			const result = getPlatformArch();
			expect(result).toBeNull();
		});

		it('should return null for unsupported architecture (s390x)', () => {
			platformSpy.mockReturnValue('linux');
			archSpy.mockReturnValue('s390x');

			const result = getPlatformArch();
			expect(result).toBeNull();
		});

		it('should return null for both unsupported platform and arch', () => {
			platformSpy.mockReturnValue('freebsd');
			archSpy.mockReturnValue('mips');

			const result = getPlatformArch();
			expect(result).toBeNull();
		});
	});

	describe('PLATFORM_MAP', () => {
		it('should contain linux and darwin', () => {
			expect(PLATFORM_MAP).toEqual({ linux: 'linux', darwin: 'darwin' });
		});
	});

	describe('ARCH_MAP', () => {
		it('should contain x64 and arm64 mappings', () => {
			expect(ARCH_MAP).toEqual({ x64: 'amd64', arm64: 'arm64' });
		});
	});

	describe('SUPPORTED', () => {
		it('should contain exactly three supported platform-arch combinations', () => {
			expect(SUPPORTED).toEqual([
				{ os: 'linux', arch: 'amd64' },
				{ os: 'linux', arch: 'arm64' },
				{ os: 'darwin', arch: 'arm64' },
			]);
		});

		it('should not include darwin amd64', () => {
			const darwinAmd64 = SUPPORTED.find((s) => s.os === 'darwin' && s.arch === 'amd64');
			expect(darwinAmd64).toBeUndefined();
		});
	});
});
