import type { ICredentialTestRequest, ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class GhppApi implements ICredentialType {
	name = 'ghppApi';
	displayName = 'GHPP API';
	documentationUrl = 'https://github.com/douhashi/n8n-nodes-ghpp';
	icon: Icon = 'file:ghpp.svg';
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.github.com',
			url: '/user',
			headers: {
				Authorization: '=Bearer {{$credentials.token}}',
			},
		},
	};
	properties: INodeProperties[] = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: 'ghp_xxxxxxxxxxxx',
			description: 'GitHub Personal Access Token (repo + project scope)',
		},
	];
}
