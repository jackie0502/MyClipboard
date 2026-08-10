import React, {
  useCallback,
  useEffect,
  useState
} from 'react';

import {
  Alert,
  Button,
  Card,
  Container,
  ListGroup,
  Spinner
} from 'react-bootstrap';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const electronAPI = window.electronAPI;

export default function App() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);

      if (!electronAPI?.clipboard?.getHistory) {
        throw new Error('Electron API unavailable');
      }

      const result =
        await electronAPI.clipboard.getHistory();

      if (!result.success) {
        throw new Error(result.error);
      }

      setHistory(result.data);
    } catch (error) {
      setMessage({
        type: 'danger',
        text: `載入失敗：${error.message}`
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe =
    electronAPI.clipboard.onHistoryUpdated(() => {
loadHistory();
    });

    return () => {unsubscribe();};
  }, [loadHistory]);

  const handleCopy = async (text) => {
    try {
      const result =
        await electronAPI.clipboard.write(text);

      if (!result.success) {
        throw new Error(result.error);
      }

      setMessage({
        type: 'success',
        text: '已複製到剪貼簿'
      });

      await loadHistory();
    } catch (error) {
      setMessage({
        type: 'danger',
        text: `複製失敗：${error.message}`
      });
    }
  };

  return (
    <Container
      className="p-2"
      style={{ height: '100vh' }}
    >
      <Card className="h-100">
        <Card.Header
          className="
            bg-primary
            text-white
            d-flex
            justify-content-between
            align-items-center
          "
        >
          <Card.Title className="mb-0">
            剪貼簿紀錄
          </Card.Title>

          <Button
            size="sm"
            variant="light"
            onClick={() => window.close()}
          >
            ×
          </Button>
        </Card.Header>

        <Card.Body className="overflow-auto">
          {message && (
            <Alert variant={message.type}>
              {message.text}
            </Alert>
          )}

          {loading && (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          )}

          {!loading && history.length === 0 && (
            <Alert variant="secondary">
              尚無剪貼簿紀錄
            </Alert>
          )}

          {!loading && history.length > 0 && (
            <ListGroup>
              {history.map((record) => (
                <ListGroup.Item
                  key={record.id}
                  action
                  onClick={() =>
                    handleCopy(record.text)
                  }
                >
                  <div
                    className="text-break"
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {record.text}
                  </div>

                  <small className="text-muted">
                    {new Date(
                      record.copiedAt
                    ).toLocaleString()}
                  </small>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>

        <Card.Footer>
          <Button
            className="w-100"
            variant="outline-primary"
            onClick={loadHistory}
            disabled={loading}
          >
            重新整理
          </Button>
        </Card.Footer>
      </Card>
    </Container>
  );
}