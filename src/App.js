import React, {
  useCallback,
  useEffect,
  useRef,
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
const windowMode = new URLSearchParams(window.location.search).get('mode');

export default function App() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [dockSide, setDockSide] = useState('right');
  const [copied, setCopied] = useState(false);
  const draggingHandle = useRef(null);
  const copiedTimer = useRef(null);

  const applyDockState = useCallback((state) => {
    setDockSide(state.side);
  }, []);

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
    loadHistory();

    const unsubscribe =
      electronAPI.clipboard.onHistoryUpdated(() => {
        loadHistory();
      });

    return unsubscribe;
  }, [loadHistory]);

  useEffect(() => {
    electronAPI.windowControls.getDockState().then(applyDockState);

    return electronAPI.windowControls.onDockStateChanged(
      applyDockState
    );
  }, [applyDockState]);

  useEffect(() => () => {
    clearTimeout(copiedTimer.current);
  }, []);

  const toggleDocked = async () => {
    const state = await electronAPI.windowControls.toggleDocked();
    applyDockState(state);
  };

  const startHandleDrag = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingHandle.current = {
      startX: event.screenX,
      startY: event.screenY,
      moved: false
    };
    electronAPI.windowControls.startDockDrag(event.screenY);
  };

  const moveHandle = (event) => {
    if (!draggingHandle.current) return;

    const distance = Math.hypot(
      event.screenX - draggingHandle.current.startX,
      event.screenY - draggingHandle.current.startY
    );
    draggingHandle.current.moved ||= distance > 4;

    if (!draggingHandle.current.moved) return;

    electronAPI.windowControls.updateDockDrag(
      event.screenX,
      event.screenY
    );
  };

  const stopHandleDrag = async (event) => {
    if (!draggingHandle.current) return;

    const wasDragged = draggingHandle.current.moved;
    draggingHandle.current = null;
    const state = await electronAPI.windowControls.endDockDrag();
    applyDockState(state);

    if (!wasDragged && event.type !== 'pointercancel') {
      await toggleDocked();
    }
  };

  const handleCopy = async (text) => {
    try {
      const result =
        await electronAPI.clipboard.write(text);

      if (!result.success) {
        throw new Error(result.error);
      }

      setMessage(null);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => {
        setCopied(false);
      }, 1200);

      await loadHistory();
    } catch (error) {
      setMessage({
        type: 'danger',
        text: `複製失敗：${error.message}`
      });
    }
  };

  const handleClearHistory = async () => {
    try {
      const result = await electronAPI.clipboard.clearHistory();

      if (!result.success) {
        throw new Error(result.error);
      }

      setHistory([]);
      setMessage(null);
    } catch (error) {
      setMessage({
        type: 'danger',
        text: `清除失敗：${error.message}`
      });
    }
  };

  if (windowMode === 'handle') {
    return (
      <button
        className={`dock-handle dock-handle-${dockSide}`}
        type="button"
        title="拖曳或點擊展開剪貼簿"
        aria-label="拖曳或點擊展開剪貼簿"
        onPointerDown={startHandleDrag}
        onPointerMove={moveHandle}
        onPointerUp={stopHandleDrag}
        onPointerCancel={stopHandleDrag}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {dockSide === 'right'
            ? <path d="m14 6-6 6 6 6" />
            : <path d="m10 6 6 6-6 6" />}
        </svg>
      </button>
    );
  }

  return (
    <Container
      className="p-2 app-content"
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
          <Card.Title
            className="mb-0"
            title={copied ? '已複製' : '剪貼簿紀錄'}
            aria-label={copied ? '已複製' : '剪貼簿紀錄'}
          >
            {copied ? (
              <svg
                className="copy-success-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            ) : (
              <svg
                className="clipboard-title-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M9 5h6" />
                <path d="M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1Z" />
                <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
              </svg>
            )}
          </Card.Title>

          <div className="header-actions">
            <Button
              className="header-icon-button"
              size="sm"
              variant="light"
              onClick={toggleDocked}
              title="收合至桌面側邊"
              aria-label="收合至桌面側邊"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {dockSide === 'right'
                  ? <path d="m10 6 6 6-6 6" />
                  : <path d="m14 6-6 6 6 6" />}
              </svg>
            </Button>

            <Button
              className="header-icon-button"
              size="sm"
              variant="light"
              onClick={handleClearHistory}
              disabled={loading || history.length === 0}
              title="清除剪貼簿紀錄"
              aria-label="清除剪貼簿紀錄"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M4 7h16" />
                <path d="M9 7V4h6v3" />
                <path d="m6 7 1 14h10l1-14" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </Button>

            <Button
              className="header-icon-button"
              size="sm"
              variant="light"
              onClick={() => electronAPI.windowControls.hide()}
              title="關閉"
              aria-label="關閉"
            >
              ×
            </Button>
          </div>
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
                  <div className="clipboard-text">
                    {record.text}
                  </div>

                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>

      </Card>
    </Container>
  );
}
