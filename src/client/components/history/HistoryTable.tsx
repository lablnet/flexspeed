import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import type { SavedResult } from '../../../shared/types';
import { dataSize, format } from '../../utils/format';

interface HistoryTableProps {
  results: SavedResult[];
  onDelete?: (id: string) => void;
}

export function HistoryTable({ results, onDelete }: HistoryTableProps) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Download</th>
            <th>Upload</th>
            <th>Latency</th>
            <th>Jitter</th>
            <th>Data</th>
            <th>Mode / server</th>
            <th>Share</th>
            {onDelete && <th>Remove</th>}
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.id}>
              <td>{new Date(result.date).toLocaleString()}</td>
              <td>
                {format(result.metrics.download)} <small>Mbps</small>
              </td>
              <td>
                {format(result.metrics.upload)} <small>Mbps</small>
              </td>
              <td>
                {format(result.metrics.latency)} <small>ms</small>
              </td>
              <td>
                {format(result.metrics.jitter)} <small>ms</small>
              </td>
              <td>{dataSize(result.bytes)}</td>
              <td>
                {result.mode} / {result.server ?? 'Local'}
              </td>
              <td>
                {result.shareUrl ? (
                  <Link className="text-button" to={new URL(result.shareUrl).pathname}>
                    View & share
                  </Link>
                ) : (
                  <span className="muted-copy">Browser only</span>
                )}
              </td>
              {onDelete && (
                <td>
                  <button
                    className="icon-button"
                    onClick={() => onDelete(result.id)}
                    aria-label={`Remove result from ${new Date(result.date).toLocaleString()}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
