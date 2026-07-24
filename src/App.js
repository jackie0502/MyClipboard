import React, { useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const electronAPI = window.electronAPI;

export default function App() {
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');

  const handleClose = () => {
    window.close();
  };

  const handleRead = async () => {
    try {
      if (!electronAPI?.clipboard?.read) {
        throw new Error('Electron API not available');
      }
      const result = await electronAPI.clipboard.read();
      if (result.success) {
        setText(result.data);
        setMessage('✅ 已讀取剪貼簿');
      } else {
        setMessage('❌ 讀取失敗: ' + result.error);
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ 讀取失敗: ' + error.message);
    }
  };

  const handleWrite = async () => {
    try {
      if (!electronAPI?.clipboard?.write) {
        throw new Error('Electron API not available');
      }
      const result = await electronAPI.clipboard.write(text);
      if (result.success) {
        setMessage('✅ 已複製到剪貼簿');
      } else {
        setMessage('❌ 複製失敗: ' + result.error);
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ 複製失敗: ' + error.message);
    }
  };

  const handleClear = () => {
    setText('');
    setMessage('');
  };

  return (
    <Container className="p-2" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
      <Card className="w-100">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <Card.Title className="mb-0">📋 剪貼簿</Card.Title>
          <button
            className="btn btn-sm btn-light"
            onClick={handleClose}
            style={{ padding: '0.25rem 0.5rem' }}
          >
            ✕
          </button>
        </Card.Header>
        <Card.Body>
          {message && (
            <Alert
              variant={message.includes('✅') ? 'success' : 'danger'}
              className="mb-3"
            >
              {message}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold" style={{ fontSize: '0.9rem' }}>剪貼簿內容</Form.Label>
            <Form.Control
              as="textarea"
              rows={7}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="輸入文字或點擊「讀取剪貼簿」按鈕..."
              className="font-monospace"
              style={{ fontSize: '0.85rem' }}
            />
          </Form.Group>

          <Row className="g-2">
            <Col sm={6}>
              <Button
                variant="primary"
                className="w-100"
                onClick={handleRead}
                style={{ fontSize: '0.9rem', padding: '0.5rem' }}
              >
                📤 讀取
              </Button>
            </Col>
            <Col sm={6}>
              <Button
                variant="success"
                className="w-100"
                onClick={handleWrite}
                style={{ fontSize: '0.9rem', padding: '0.5rem' }}
              >
                📥 複製
              </Button>
            </Col>
          </Row>

          <Row className="g-2 mt-2">
            <Col sm={12}>
              <Button
                variant="secondary"
                className="w-100"
                onClick={handleClear}
                style={{ fontSize: '0.9rem', padding: '0.5rem' }}
              >
                🗑️ 清空
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}
