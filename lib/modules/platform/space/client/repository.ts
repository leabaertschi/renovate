import type {SpaceHttp} from "../../../../util/http/space";
import type {SpaceBranchInfo, SpaceFileContent, SpaceRepositoryBasicInfo, SpaceRepositoryDetails} from "../types";
import {logger} from "../../../../logger";
import {PaginatedIterable} from "../paginated-iterator";
import {flatten} from "../utils";

export class SpaceRepositoryClient {
  constructor(private http: SpaceHttp) {

  }

  async getAll(): Promise<SpaceRepositoryBasicInfo[]> {
    logger.debug("SPACE: getAllRepositoriesForAllProjects")

    const iterable = PaginatedIterable.fromGetUsingNext<SpaceRepositoryBasicInfo>(this.http, '/api/http/projects/repositories')
    const repos = await flatten(iterable)
    logger.debug(`SPACE: getAllRepositoriesForAllProjects, all repos: ${JSON.stringify(repos)}`)

    return repos
  }

  async getByName(projectKey: string, repository: string): Promise<SpaceRepositoryDetails> {
    logger.debug(`SPACE: getRepositoryInfo: repository=${repository}, projectKey=${projectKey}`);
    const repoInfo = await this.http.getJson<SpaceRepositoryDetails>(
      `/api/http/projects/key:${projectKey}/repositories/${repository}`,
    );
    return repoInfo.body;
  }

  async getAllBranchesHeads(projectKey: string, repository: string): Promise<SpaceBranchInfo[]> {
    logger.debug(`SPACE: getRepositoriesHeads: projectKey=${projectKey}, repository=${repository}`)

    const iterable = PaginatedIterable.fromGetUsingSkip<SpaceBranchInfo>(
      this.http, `/api/http/projects/key:${projectKey}/repositories/${repository}/heads`
    )

    const heads = await flatten(iterable)
    logger.debug(`SPACE: findRepositoryHeads: result: ${JSON.stringify(heads)}`)

    return heads
  }

  async getFileContent(projectKey: string, repository: string, path: string, commit: string): Promise<string> {
    logger.debug(`SPACE getFileTextContent(${projectKey}, ${repository}, ${commit}, ${path})`)

    const fileContent = await this.http.getJson<SpaceFileContent>(
      `/api/http/projects/key:${projectKey}/repositories/${repository}/text-content?commit=${commit}&path=${path}`,
    )
    const body = fileContent.body
    logger.debug(`SPACE getFileTextContent(${projectKey}, ${repository}, ${commit}, ${path}): got ${body.lines.length}`)

    return body.lines.map(it => it.text).join("\n")
  }
}
