import axios, { AxiosInstance } from "axios";

export interface WindmillConfig {
  baseUrl: string;
  apiKey?: string;
  workspace: string;
}

export class WindmillApiClient {
  private client: AxiosInstance;
  private workspace: string;

  constructor(config: WindmillConfig) {
    this.workspace = config.workspace;
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api`,
      headers: config.apiKey
        ? { Authorization: `Bearer ${config.apiKey}` }
        : {},
    });
  }

  async listFlows(): Promise<any[]> {
    const response = await this.client.get(`/w/${this.workspace}/flows`);
    return response.data;
  }

  async getFlow(path: string): Promise<any> {
    const response = await this.client.get(
      `/w/${this.workspace}/flows/${encodeURIComponent(path)}`
    );
    return response.data;
  }

  async createFlow(flowData: {
    path: string;
    summary: string;
    value: any;
  }): Promise<any> {
    const response = await this.client.post(
      `/w/${this.workspace}/flows/create`,
      {
        path: flowData.path,
        summary: flowData.summary,
        value: flowData.value,
      }
    );
    return response.data;
  }

  async updateFlow(path: string, flowData: any): Promise<any> {
    const response = await this.client.post(
      `/w/${this.workspace}/flows/${encodeURIComponent(path)}`,
      flowData
    );
    return response.data;
  }
}
