import { execFile } from 'child_process';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { Ghpp } from './Ghpp.node';

vi.mock('child_process', () => ({
	execFile: vi.fn(),
	execFileSync: vi.fn(),
}));

vi.mock('fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('fs')>();
	return {
		...actual,
		existsSync: vi.fn().mockReturnValue(true),
	};
});

const mockedExecFile = vi.mocked(execFile);

function createMockExecuteFunctions(overrides?: {
	operation?: string;
	planLimit?: number;
	staleThreshold?: string;
	dryRun?: boolean;
	statusSettings?: Record<string, string>;
}): IExecuteFunctions {
	const credentials = { token: 'ghp_test_token' };
	const params: Record<string, unknown> = {
		operation: overrides?.operation ?? 'promote',
		owner: 'test-org',
		projectNumber: 42,
		planLimit: overrides?.planLimit ?? 3,
		staleThreshold: overrides?.staleThreshold ?? '2h',
		dryRun: overrides?.dryRun ?? false,
		statusSettings: overrides?.statusSettings ?? {},
	};

	return {
		getCredentials: vi.fn().mockResolvedValue(credentials),
		getInputData: vi.fn().mockReturnValue([{ json: {} }]),
		getNodeParameter: vi.fn().mockImplementation((name: string) => params[name]),
		getNode: vi.fn().mockReturnValue({ name: 'GHPP' }),
	} as unknown as IExecuteFunctions;
}

function setupExecFileSuccess(stdout = '{}') {
	mockedExecFile.mockImplementation((_cmd, _args, callback: unknown) => {
		(callback as (...args: unknown[]) => void)(null, { stdout, stderr: '' });
		return undefined as never;
	});
}

describe('Ghpp.node', () => {
	const ghpp = new Ghpp();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should parse JSON response from stdout', async () => {
		const expected = { promoted: 3, items: ['a', 'b', 'c'] };
		setupExecFileSuccess(JSON.stringify(expected));

		const mockFns = createMockExecuteFunctions();
		const result = await ghpp.execute.call(mockFns);

		expect(result).toEqual([[{ json: expected }]]);
	});

	it('should fallback to raw stdout when JSON parse fails', async () => {
		const rawOutput = 'not-json-output';
		mockedExecFile.mockImplementation((_cmd, _args, callback: unknown) => {
			(callback as (...args: unknown[]) => void)(null, { stdout: rawOutput, stderr: '' });
			return undefined as never;
		});

		const mockFns = createMockExecuteFunctions();
		const result = await ghpp.execute.call(mockFns);

		expect(result).toEqual([[{ json: { raw: rawOutput } }]]);
	});

	it('should throw NodeOperationError when execFile fails', async () => {
		const stderrMsg = 'ghpp: authentication failed';
		mockedExecFile.mockImplementation((_cmd, _args, callback: unknown) => {
			const error = new Error('Command failed') as Error & { stderr: string };
			error.stderr = stderrMsg;
			(callback as (...args: unknown[]) => void)(error);
			return undefined as never;
		});

		const mockFns = createMockExecuteFunctions();
		await expect(ghpp.execute.call(mockFns)).rejects.toThrow(NodeOperationError);
	});

	it('should include --plan-limit and --status-* flags when non-default values are set', async () => {
		setupExecFileSuccess();

		const mockFns = createMockExecuteFunctions({
			planLimit: 5,
			statusSettings: {
				statusInbox: 'Todo',
				statusPlan: 'Planning',
				statusReady: 'Approved',
				statusDoing: 'Working',
			},
		});
		await ghpp.execute.call(mockFns);

		const callArgs = mockedExecFile.mock.calls[0][1] as string[];
		expect(callArgs).toContain('--plan-limit');
		expect(callArgs).toContain('5');
		expect(callArgs).toContain('--status-inbox');
		expect(callArgs).toContain('Todo');
		expect(callArgs).toContain('--status-plan');
		expect(callArgs).toContain('Planning');
		expect(callArgs).toContain('--status-ready');
		expect(callArgs).toContain('Approved');
		expect(callArgs).toContain('--status-doing');
		expect(callArgs).toContain('Working');
	});

	it('should omit --plan-limit and --status-* flags when default values are used', async () => {
		setupExecFileSuccess();

		const mockFns = createMockExecuteFunctions();
		await ghpp.execute.call(mockFns);

		const callArgs = mockedExecFile.mock.calls[0][1] as string[];
		expect(callArgs).not.toContain('--plan-limit');
		expect(callArgs).not.toContain('--status-inbox');
		expect(callArgs).not.toContain('--status-plan');
		expect(callArgs).not.toContain('--status-ready');
		expect(callArgs).not.toContain('--status-doing');
	});

	it('should use demote as first arg when operation is demote', async () => {
		setupExecFileSuccess();

		const mockFns = createMockExecuteFunctions({ operation: 'demote' });
		await ghpp.execute.call(mockFns);

		const callArgs = mockedExecFile.mock.calls[0][1] as string[];
		expect(callArgs[0]).toBe('demote');
		expect(callArgs).not.toContain('--plan-limit');
	});

	it('should include --stale-threshold when demote with non-default value', async () => {
		setupExecFileSuccess();

		const mockFns = createMockExecuteFunctions({
			operation: 'demote',
			staleThreshold: '30m',
		});
		await ghpp.execute.call(mockFns);

		const callArgs = mockedExecFile.mock.calls[0][1] as string[];
		expect(callArgs).toContain('--stale-threshold');
		expect(callArgs).toContain('30m');
	});

	it('should omit --stale-threshold when demote with default value', async () => {
		setupExecFileSuccess();

		const mockFns = createMockExecuteFunctions({ operation: 'demote' });
		await ghpp.execute.call(mockFns);

		const callArgs = mockedExecFile.mock.calls[0][1] as string[];
		expect(callArgs).not.toContain('--stale-threshold');
	});

	it('should include --dry-run when dryRun is true for promote', async () => {
		setupExecFileSuccess();

		const mockFns = createMockExecuteFunctions({ operation: 'promote', dryRun: true });
		await ghpp.execute.call(mockFns);

		const callArgs = mockedExecFile.mock.calls[0][1] as string[];
		expect(callArgs[0]).toBe('promote');
		expect(callArgs).toContain('--dry-run');
	});

	it('should omit --dry-run when dryRun is false for promote', async () => {
		setupExecFileSuccess();

		const mockFns = createMockExecuteFunctions({ operation: 'promote', dryRun: false });
		await ghpp.execute.call(mockFns);

		const callArgs = mockedExecFile.mock.calls[0][1] as string[];
		expect(callArgs).not.toContain('--dry-run');
	});

	it('should include --dry-run when dryRun is true for demote', async () => {
		setupExecFileSuccess();

		const mockFns = createMockExecuteFunctions({ operation: 'demote', dryRun: true });
		await ghpp.execute.call(mockFns);

		const callArgs = mockedExecFile.mock.calls[0][1] as string[];
		expect(callArgs[0]).toBe('demote');
		expect(callArgs).toContain('--dry-run');
	});
});
