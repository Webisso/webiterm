import { MysqlWorkspace } from "./mysql/MysqlWorkspace";

type MysqlPaneProps = {
  connectionId: string;
};

export function MysqlPane({ connectionId }: MysqlPaneProps) {
  return <MysqlWorkspace connectionId={connectionId} />;
}
