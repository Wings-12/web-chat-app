import pytest
import json
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket
from app.main import app, messages, manager

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_messages():
    messages.clear()
    manager.active_connections.clear()

def test_healthz_endpoint():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_get_messages_empty():
    response = client.get("/messages")
    assert response.status_code == 200
    assert response.json() == {"messages": []}

def test_get_messages_with_data():
    test_message = {
        "id": "test-id",
        "username": "testuser",
        "content": "test message",
        "timestamp": "2025-01-01T00:00:00"
    }
    messages.append(test_message)
    
    response = client.get("/messages")
    assert response.status_code == 200
    assert response.json() == {"messages": [test_message]}

def test_websocket_connection():
    with client.websocket_connect("/ws") as websocket:
        assert len(manager.active_connections) == 1

def test_websocket_message_sending():
    with client.websocket_connect("/ws") as websocket:
        test_data = {
            "username": "testuser",
            "content": "Hello, World!"
        }
        
        websocket.send_text(json.dumps(test_data))
        
        response = websocket.receive_text()
        message_data = json.loads(response)
        
        assert message_data["username"] == "testuser"
        assert message_data["content"] == "Hello, World!"
        assert "id" in message_data
        assert "timestamp" in message_data
        assert len(messages) == 1

def test_websocket_broadcast():
    with client.websocket_connect("/ws") as websocket1:
        with client.websocket_connect("/ws") as websocket2:
            test_data = {
                "username": "user1",
                "content": "Broadcast test"
            }
            
            websocket1.send_text(json.dumps(test_data))
            
            response1 = websocket1.receive_text()
            response2 = websocket2.receive_text()
            
            assert response1 == response2
            
            message_data = json.loads(response1)
            assert message_data["username"] == "user1"
            assert message_data["content"] == "Broadcast test"

def test_connection_manager_connect():
    assert len(manager.active_connections) == 0
    
def test_connection_manager_disconnect():
    with client.websocket_connect("/ws") as websocket:
        assert len(manager.active_connections) == 1
    
    assert len(manager.active_connections) == 0

@pytest.mark.asyncio
async def test_connection_manager_broadcast():
    from unittest.mock import AsyncMock, MagicMock
    
    mock_websocket1 = AsyncMock()
    mock_websocket2 = AsyncMock()
    
    manager.active_connections = [mock_websocket1, mock_websocket2]
    
    await manager.broadcast("test message")
    
    mock_websocket1.send_text.assert_called_once_with("test message")
    mock_websocket2.send_text.assert_called_once_with("test message")
