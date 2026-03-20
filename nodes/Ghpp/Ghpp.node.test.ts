import { execFile } from 'child_process';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { Ghpp } from './Ghpp.node';

vi.mock('child_process', () => ({
	execFile: vi.fn(),
}));

const mockedExecFile = vi.mocked(execFile);

function createMockExecuteFunctions(overrides?: {
	planLimit?: number;
	statusSettings?: Record<string, string>;
}): IExecuteFunctions {
	const credentials = { token: 'ghp_test_token' };
	const params: Record<string, unknown> = {
		owner: 'test-org',
		projectNumber: 42,
		planLimit: overrides?.planLimit ?? 3,
		statusSettings: overrides?.statusSettings ?? {},
	};

	return {
		getCredentials: vi.fn().mockResolvedValue(credentials),
		getInputData: vi.fn().mockReturnValue([{ json: {} }]),
		getNodeParameter: vi.fn().mockImplementation((name: string) => params[name]),
		getNode: vi.fn().mockReturnValue({ name: 'GHPP' }),
	} as unknown as IExecuteFunctions;
}

describe('Ghpp.node', () => {
	const ghpp = new Ghpp();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should parse JSON response from stdout', async () => {
		const expected = { promoted: 3, items: ['a', 'b', 'c'] };
		mockedExecFile.mockImplementation((_cmd, _args, callback: unknown) => {
			(callback as (...args: unknown[]) => void)(null, {
				stdout: JSON.stringify(expected),
				stderr: '',
			});
			return undefined as never;
		});

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
		mockedExecFile.mockImplementation((_cmd, _args, callback: unknown) => {
			(callback as (...args: unknown[]) => void)(null, { stdout: '{}', stderr: '' });
			return undefined as never;
		});

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
		mockedExecFile.mockImplementation((_cmd, _args, callback: unknown) => {
			(callback as (...args: unknown[]) => void)(null, { stdout: '{}', stderr: '' });
			return undefined as never;
		});

		const mockFns = createMockExecuteFunctions();
		await ghpp.execute.call(mockFns);

		const callArgs = mockedExecFile.mock.calls[0][1] as string[];
		expect(callArgs).not.toContain('--plan-limit');
		expect(callArgs).not.toContain('--status-inbox');
		expect(callArgs).not.toContain('--status-plan');
		expect(callArgs).not.toContain('--status-ready');
		expect(callArgs).not.toContain('--status-doing');
	});
});
