import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const execFileAsync = promisify(execFile);
const binaryPath = path.join(__dirname, '../../bin/ghpp');

export class Ghpp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GHPP',
		name: 'ghpp',
		icon: 'file:ghpp.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'ghpp promote',
		description: 'Run ghpp promote to manage GitHub Project items',
		defaults: { name: 'GHPP' },
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'ghppApi', required: true }],
		properties: [
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
		const credentials = await this.getCredentials('ghppApi');
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const owner = this.getNodeParameter('owner', i) as string;
			const projectNumber = this.getNodeParameter('projectNumber', i) as number;
			const planLimit = this.getNodeParameter('planLimit', i) as number;
			const statusSettings = this.getNodeParameter('statusSettings', i) as {
				statusInbox?: string;
				statusPlan?: string;
				statusReady?: string;
				statusDoing?: string;
			};

			const args = [
				'promote',
				'--owner',
				owner,
				'--project-number',
				String(projectNumber),
				'--token',
				String(credentials.token),
			];

			if (planLimit !== 3) {
				args.push('--plan-limit', String(planLimit));
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
