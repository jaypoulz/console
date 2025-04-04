import * as React from 'react';
import { DocumentTitle } from '@console/shared/src/components/document-title/DocumentTitle';
import { useTranslation } from 'react-i18next';
import { Bullseye, Button, Icon, Spinner, Title } from '@patternfly/react-core';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@console/shared';
import { Table, TableGridBreakpoint, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import { ResourceLink } from './utils';
import { referenceFor } from '../module/k8s';

/**
 * Without this prop our current TS types fail to match and require a `translate` prop to be added. PF suggests we
 * update our types, but that causes other issues. This will have to do as a workaround for now.
 *
 * This is the best that I can find relates to this value:
 * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/3423b4fc3e3da09f8acc386bc2fee6fb8f5e0880/types/react/index.d.ts#L1763
 */
const reactPropFix = {
  translate: 'no' as 'no',
};

export const ImportYAMLPageStatus: React.FC<ImportYAMLPageStatusProps> = ({ errors, inFlight }) => {
  const { t } = useTranslation();
  let StatusBlock: React.ReactNode;

  if (inFlight) {
    StatusBlock = (
      <>
        <Spinner size="lg" />
        <Title headingLevel="h2" className="pf-v6-u-mb-sm">
          {t('public~Creating resources...')}
        </Title>
      </>
    );
  } else if (!inFlight && !errors) {
    StatusBlock = (
      <>
        <Icon size="lg">
          <GreenCheckCircleIcon />
        </Icon>

        <Title
          headingLevel="h2"
          className="pf-v6-u-mb-sm"
          data-test="resources-successfully-created"
        >
          {t('public~Resources successfully created')}
        </Title>
      </>
    );
  } else {
    StatusBlock = (
      <>
        <Icon size="lg">
          <YellowExclamationTriangleIcon />
        </Icon>

        <Title headingLevel="h2" className="pf-v6-u-mb-sm">
          {t('public~One or more resources failed to be created')}
        </Title>
      </>
    );
  }
  return <div className="co-import-yaml-status pf-v6-u-text-align-center">{StatusBlock}</div>;
};

export const ImportYAMLResourceStatus: React.FC<ImportYAMLResourceStatusProps> = ({
  creating,
  error,
  message,
}) => {
  let StatusIcon: React.ReactNode;
  if (creating) {
    StatusIcon = <Spinner size="sm" className="co-icon-space-r" />;
  } else if (error) {
    StatusIcon = (
      <Icon size="sm">
        <RedExclamationCircleIcon className="co-icon-space-r" />
      </Icon>
    );
  } else {
    StatusIcon = (
      <Icon size="sm">
        <GreenCheckCircleIcon className="co-icon-space-r" />
      </Icon>
    );
  }
  return (
    <span>
      {StatusIcon}
      {message}
    </span>
  );
};

export const ImportYAMLResults: React.FC<ImportYAMLResultsProps> = ({
  createResources,
  displayResults,
  importResources,
  retryFailed,
}) => {
  const { t } = useTranslation();
  const [importStatus, setImportStatus] = React.useState<ImportYAMLStatus[]>(
    importResources.map(() => ({
      creating: true,
      message: t('public~Creating'),
    })),
  );
  const [inFlight, setInFlight] = React.useState(true);
  const errors = importStatus.some((s) => s.error);

  React.useEffect(() => {
    createResources(importResources).then((results) => {
      setImportStatus(
        results.map((result) => {
          if (result.status === 'fulfilled') {
            return { creating: false, result: result.result, message: t('public~Created') };
          }
          if (result.status === 'rejected') {
            return {
              creating: false,
              error: true,
              message: t('public~Error: {{error}}', { error: result?.reason?.substring(11) }),
            };
          }
        }),
      );
      setInFlight(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRetry = () => {
    const failedResourceObjects = importStatus.reduce((acc, status, index) => {
      if (!status.error) {
        return acc;
      }
      return [...acc, importResources[index]];
    }, []);
    retryFailed(failedResourceObjects);
  };

  return (
    <div className="co-import-yaml-results-page">
      <DocumentTitle>{t('public~Import YAML Results')}</DocumentTitle>
      <Bullseye>
        <div className="co-import-yaml-results-page__main">
          <ImportYAMLPageStatus inFlight={inFlight} errors={errors} />
          <Table
            gridBreakPoint={TableGridBreakpoint.none}
            variant="compact"
            aria-label={t('public~Import YAML results')}
            {...reactPropFix}
          >
            <Thead {...reactPropFix}>
              <Tr {...reactPropFix}>
                <Th {...reactPropFix}>{t('public~Name')}</Th>
                <Th {...reactPropFix}>{t('public~Namespace')}</Th>
                <Th {...reactPropFix}>{t('public~Creation status')}</Th>
              </Tr>
            </Thead>
            <Tbody {...reactPropFix}>
              {importResources.map((importResource, index) => {
                const status = importStatus[index];
                const resource = status.result || importResource;
                const name =
                  !resource.metadata.name && resource.metadata.generateName
                    ? `${resource.metadata.generateName}...`
                    : resource.metadata.name;
                return (
                  <Tr key={index} {...reactPropFix}>
                    <Td {...reactPropFix}>
                      <ResourceLink
                        kind={referenceFor(resource) || resource.kind}
                        name={name}
                        namespace={resource.metadata?.namespace}
                        linkTo={!inFlight && !importStatus[index].error}
                      />
                    </Td>
                    <Td {...reactPropFix}>
                      {resource.metadata?.namespace ? (
                        <ResourceLink kind="Namespace" name={resource.metadata.namespace} />
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td {...reactPropFix}>
                      <ImportYAMLResourceStatus {...status} />
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
          {!inFlight && (
            <>
              {errors && (
                <div className="co-import-yaml-results-page__footer">
                  <Button
                    variant="primary"
                    type="button"
                    onClick={onRetry}
                    data-test="retry-failed-resources"
                  >
                    {t('public~Retry failed resources')}
                  </Button>
                </div>
              )}
              <div className="co-import-yaml-results-page__footer">
                <Button
                  data-test="import-more-yaml"
                  variant="link"
                  type="button"
                  onClick={() => displayResults(false)}
                >
                  {t('public~Import more YAML')}
                </Button>
              </div>
            </>
          )}
        </div>
      </Bullseye>
    </div>
  );
};

type ImportYAMLStatus = {
  creating: boolean;
  result?: any;
  error?: boolean;
  message: string;
};
type ImportYAMLPageStatusProps = {
  errors?: boolean;
  inFlight: boolean;
};
type ImportYAMLResourceStatusProps = {
  creating: boolean;
  error?: boolean;
  message: string;
};
type ImportYAMLResultsProps = {
  createResources: (objs: any, isDryRun?: boolean) => any;
  displayResults: (value: boolean) => void;
  importResources: any;
  retryFailed: (retryObjects: any) => void;
};
