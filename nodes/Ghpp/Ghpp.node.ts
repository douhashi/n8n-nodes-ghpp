import { execFile, execFileSync } from 'child_process';
import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { ApplicationError, NodeOperationError } from 'n8n-workflow';

const execFileAsync = promisify(execFile);
const binDir = path.join(__dirname, '../../../bin');
const binaryPath = path.join(binDir, 'ghpp');

const PLATFORM_MAP: Record<string, string> = { linux: 'linux', darwin: 'darwin' };
const ARCH_MAP: Record<string, string> = { x64: 'amd64', arm64: 'arm64' };
const MAX_REDIRECTS = 5;

function getGhppVersion(): string {
	const pkgPath = path.join(__dirname, '../../../package.json');
	try {
		const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
			ghpp?: { version?: string };
		};
		return pkgJson.ghpp?.version || 'latest';
	} catch {
		return 'latest';
	}
}

function getBaseUrl(): string {
	const version = getGhppVersion();
	return version === 'latest'
		? 'https://github.com/douhashi/ghpp/releases/latest/download'
		: `https://github.com/douhashi/ghpp/releases/download/v${version}`;
}

function downloadFile(url: string, dest: string, redirectCount = 0): Promise<void> {
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
				if (
					res.statusCode &&
					res.statusCode >= 300 &&
					res.statusCode < 400 &&
					res.headers.location
				) {
					res.resume();
					downloadFile(res.headers.location, dest, redirectCount + 1)
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
				file.on('finish', () => file.close(() => resolve()));
				file.on('error', (err) => {
					fs.unlink(dest, () => {});
					reject(err);
				});
			})
			.on('error', reject);
	});
}

async function ensureBinary(): Promise<void> {
	if (fs.existsSync(binaryPath)) return;

	const mappedOS = PLATFORM_MAP[os.platform()];
	const mappedArch = ARCH_MAP[os.arch()];
	if (!mappedOS || !mappedArch) {
		throw new ApplicationError(`Unsupported platform: ${os.platform()} ${os.arch()}`);
	}

	fs.mkdirSync(binDir, { recursive: true });

	const tarName = `ghpp_${mappedOS}_${mappedArch}.tar.gz`;
	const tarPath = path.join(binDir, '.ghpp.tar.gz');

	await downloadFile(`${getBaseUrl()}/${tarName}`, tarPath);
	execFileSync('tar', ['xzf', tarPath, '-C', binDir]);
	fs.chmodSync(binaryPath, 0o755);
	fs.unlinkSync(tarPath);
}

export class Ghpp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GHPP',
		name: 'ghpp',
		icon: 'file:ghpp.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] === "demote" ? "ghpp demote" : "ghpp promote"}}',
		description: 'Run ghpp promote/demote to manage GitHub Project Issue items',
		defaults: { name: 'GHPP' },
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'ghppApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Promote',
						value: 'promote',
						description: 'Promote Issue items to the next status',
						action: 'Promote issue items to the next status',
					},
					{
						name: 'Demote',
						value: 'demote',
						description: 'Demote stale Issue items to the previous status',
						action: 'Demote stale issue items to the previous status',
					},
				],
				default: 'promote',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'your-org-or-user',
				description: 'GitHub owner (user or organization)',
			},
			{
				displayName: 'Project Number',
				name: 'projectNumber',
				type: 'number',
				required: true,
				default: 0,
				typeOptions: { minValue: 1 },
				description: 'GitHub Project number',
			},
			{
				displayName: 'Plan Limit',
				name: 'planLimit',
				type: 'number',
				default: 3,
				typeOptions: { minValue: 1 },
				description: 'Maximum number of items to promote to Plan',
				displayOptions: {
					show: {
						operation: ['promote'],
					},
				},
			},
			{
				displayName: 'Stale Threshold',
				name: 'staleThreshold',
				type: 'string',
				default: '2h',
				description: 'Duration threshold for considering an item stale (e.g. "2h", "30m")',
				displayOptions: {
					show: {
						operation: ['demote'],
					},
				},
			},
			{
				displayName: 'Dry Run',
				name: 'dryRun',
				type: 'boolean',
				default: false,
				description: 'Whether to run in dry-run mode (no changes will be made)',
			},
			{
				displayName: 'Status Settings',
				name: 'statusSettings',
				type: 'collection',
				placeholder: 'Add Setting',
				default: {},
				options: [
					{
						displayName: 'Status Inbox',
						name: 'statusInbox',
						type: 'string',
						default: 'Backlog',
						description: 'Status name for inbox items',
					},
					{
						displayName: 'Status Plan',
						name: 'statusPlan',
						type: 'string',
						default: 'Plan',
						description: 'Status name for planned items',
					},
					{
						displayName: 'Status Ready',
						name: 'statusReady',
						type: 'string',
						default: 'Ready',
						description: 'Status name for ready items',
					},
					{
						displayName: 'Status Doing',
						name: 'statusDoing',
						type: 'string',
						default: 'In progress',
						description: 'Status name for in-progress items',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		try {
			await ensureBinary();
		} catch (error: unknown) {
			const err = error as { message?: string };
			throw new NodeOperationError(
				this.getNode(),
				`Failed to install ghpp binary: ${err.message || 'Unknown error'}`,
			);
		}

		const credentials = await this.getCredentials('ghppApi');
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const owner = this.getNodeParameter('owner', i) as string;
			const projectNumber = this.getNodeParameter('projectNumber', i) as number;
			const dryRun = this.getNodeParameter('dryRun', i) as boolean;
			const statusSettings = this.getNodeParameter('statusSettings', i) as {
				statusInbox?: string;
				statusPlan?: string;
				statusReady?: string;
				statusDoing?: string;
			};

			const args = [
				operation,
				'--owner',
				owner,
				'--project-number',
				String(projectNumber),
				'--token',
				String(credentials.token),
			];

			if (operation === 'promote') {
				const planLimit = this.getNodeParameter('planLimit', i) as number;
				if (planLimit !== 3) {
					args.push('--plan-limit', String(planLimit));
				}
			}

			if (operation === 'demote') {
				const staleThreshold = this.getNodeParameter('staleThreshold', i) as string;
				if (staleThreshold !== '2h') {
					args.push('--stale-threshold', staleThreshold);
				}
			}

			if (dryRun) {
				args.push('--dry-run');
			}

			if (statusSettings.statusInbox !== undefined) {
				args.push('--status-inbox', statusSettings.statusInbox);
			}
			if (statusSettings.statusPlan !== undefined) {
				args.push('--status-plan', statusSettings.statusPlan);
			}
			if (statusSettings.statusReady !== undefined) {
				args.push('--status-ready', statusSettings.statusReady);
			}
			if (statusSettings.statusDoing !== undefined) {
				args.push('--status-doing', statusSettings.statusDoing);
			}

			try {
				const { stdout } = await execFileAsync(binaryPath, args);
				try {
					const parsed = JSON.parse(stdout) as IDataObject;
					returnData.push({ json: parsed });
				} catch {
					returnData.push({ json: { raw: stdout } });
				}
			} catch (error: unknown) {
				const err = error as { stderr?: string; message?: string };
				const message = err.stderr || err.message || 'Unknown error';
				throw new NodeOperationError(this.getNode(), message);
			}
		}

		return [returnData];
	}
}
