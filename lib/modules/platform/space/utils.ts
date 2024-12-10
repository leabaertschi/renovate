import { logger } from '../../../logger';
import type { PrState } from '../../../types';
import * as hostRules from '../../../util/host-rules';
import { hashBody } from '../pr-body';
import type { Pr } from '../types';
import type { SpaceCodeReviewState, SpaceMergeRequestRecord } from './types';

export function getSpaceRepoUrl(repository: string, endpoint: string): string {
  if (repository.indexOf('/') === -1) {
    throw Error(
      'Init: repository name must include project key, like my-project/my-repo (default project key is "main")',
    );
  }

  const opts = hostRules.find({
    hostType: 'space',
    url: endpoint,
  });

  const url = new URL(endpoint);
  if (!opts.token) {
    throw new Error('Init: You must configure a JetBrains Space token');
  }
  url.username = 'username-doesnt-matter';
  url.password = opts.token;
  url.pathname = repository;

  logger.debug(
    { url: url.toString() },
    'using URL based on configured endpoint',
  );
  return url.toString();
}

export async function flatten<T>(iterable: AsyncIterable<T[]>): Promise<T[]> {
  return await mapNotNullFlatten(iterable, (it) => Promise.resolve(it));
}

export async function mapNotNullFlatten<T, R>(
  iterable: AsyncIterable<T[]>,
  mapper: (value: T) => Promise<R | undefined>,
  limit?: number,
): Promise<R[]> {
  const result: R[] = [];

  for await (const page of iterable) {
    for (const element of page) {
      const mapped = await mapper(element);
      if (mapped) {
        result.push(mapped);
      }

      if (limit && result.length >= limit) {
        return result;
      }
    }
  }

  return result;
}

export function mapSpaceCodeReviewDetailsToPr(
  details: SpaceMergeRequestRecord,
  body: string,
): Pr {
  return {
    number: details.number,
    state: mapSpaceCodeReviewStateToPrState(
      details.state,
      details.canBeReopened ?? false,
    ),
    sourceBranch: details.branchPairs[0].sourceBranch,
    targetBranch: details.branchPairs[0].targetBranch,
    title: details.title,
    // TODO: add reviewers retrieval
    // reviewers:
    //   change.reviewers?.REVIEWER?.filter(
    //     (reviewer) => typeof reviewer.username === 'string',
    //   ).map((reviewer) => reviewer.username!) ?? [],
    bodyStruct: {
      hash: hashBody(body),
    },
  };
}

function mapSpaceCodeReviewStateToPrState(
  state: SpaceCodeReviewState,
  canBeReopened: boolean,
): PrState {
  switch (state) {
    case 'Opened':
      return 'open';
    case 'Closed':
      // there is no distinct state for merged PRs
      // except a flag that indicates if a PR could be reopened, which is set to false for merged ones
      if (canBeReopened) {
        return 'closed';
      } else {
        return 'merged';
      }
    case 'Deleted':
      // should not normally reach here
      return 'closed';
    default:
      return 'all';
  }
}
