import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import styles from "./DataTable.module.css";

// columns: [{ key, header, render?: (row, index) => node, width? }]
// rows: null while loading, [] when loaded-but-empty, array otherwise.
export default function DataTable({ columns, rows, getRowKey, emptyState, loadingLabel }) {
  if (rows === null || rows === undefined) {
    return (
      <div className={styles.tableWrap}>
        <LoadingState label={loadingLabel} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={styles.tableWrap}>
        {emptyState ?? <EmptyState title="No records found" />}
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row) : index}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row, index) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
