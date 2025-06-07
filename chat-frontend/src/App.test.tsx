import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import App from './App'

const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 0,
  onopen: null as ((event: Event) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onclose: null as ((event: CloseEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
}

global.WebSocket = vi.fn(() => mockWebSocket) as any

global.fetch = vi.fn()

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ messages: [] })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Username Setup Phase', () => {
    it('renders username input form initially', () => {
      render(<App />)
      
      expect(screen.getByText('チャットアプリ')).toBeInTheDocument()
      expect(screen.getByText('ユーザー名を入力してください')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('ユーザー名')).toBeInTheDocument()
      expect(screen.getByText('チャットに参加')).toBeInTheDocument()
    })

    it('disables join button when username is empty', () => {
      render(<App />)
      
      const joinButton = screen.getByText('チャットに参加')
      expect(joinButton).toBeDisabled()
    })

    it('enables join button when username is entered', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      const usernameInput = screen.getByPlaceholderText('ユーザー名')
      const joinButton = screen.getByText('チャットに参加')
      
      await user.type(usernameInput, 'testuser')
      
      expect(joinButton).not.toBeDisabled()
    })

    it('joins chat when join button is clicked', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      const usernameInput = screen.getByPlaceholderText('ユーザー名')
      const joinButton = screen.getByText('チャットに参加')
      
      await user.type(usernameInput, 'testuser')
      await user.click(joinButton)
      
      await waitFor(() => {
        expect(screen.getByText('チャットルーム')).toBeInTheDocument()
      })
    })

    it('joins chat when Enter key is pressed in username input', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      const usernameInput = screen.getByPlaceholderText('ユーザー名')
      
      await user.type(usernameInput, 'testuser')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText('チャットルーム')).toBeInTheDocument()
      })
    })
  })

  describe('Chat Room Phase', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<App />)
      
      const usernameInput = screen.getByPlaceholderText('ユーザー名')
      await user.type(usernameInput, 'testuser')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText('チャットルーム')).toBeInTheDocument()
      })
    })

    it('renders chat room interface after username is set', () => {
      expect(screen.getByText('チャットルーム')).toBeInTheDocument()
      expect(screen.getByText('testuser として参加中')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('メッセージを入力...')).toBeInTheDocument()
    })

    it('shows connection status indicator', () => {
      const statusIndicator = document.querySelector('.w-2.h-2.rounded-full')
      expect(statusIndicator).toBeInTheDocument()
    })

    it('loads messages on mount', () => {
      expect(global.fetch).toHaveBeenCalledWith('https://app-qdndbywz.fly.dev/messages')
    })

    it('creates WebSocket connection on mount', () => {
      expect(global.WebSocket).toHaveBeenCalledWith('wss://app-qdndbywz.fly.dev/ws')
    })

    it('disables message input when not connected', async () => {
      const messageInput = screen.getByPlaceholderText('メッセージを入力...')
      expect(messageInput).toBeDisabled()
    })

    it('enables message input when connected', async () => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event)
      }
      
      await waitFor(() => {
        const messageInput = screen.getByPlaceholderText('メッセージを入力...')
        expect(messageInput).not.toBeDisabled()
      })
    })

    it('sends message when send button is clicked', async () => {
      const user = userEvent.setup()
      
      mockWebSocket.readyState = 1
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event)
      }
      
      await waitFor(() => {
        const messageInput = screen.getByPlaceholderText('メッセージを入力...')
        expect(messageInput).not.toBeDisabled()
      })
      
      const messageInput = screen.getByPlaceholderText('メッセージを入力...')
      const sendButton = screen.getByRole('button')
      
      await user.type(messageInput, 'Hello World')
      await user.click(sendButton)
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          username: 'testuser',
          content: 'Hello World'
        })
      )
    })

    it('sends message when Enter key is pressed', async () => {
      const user = userEvent.setup()
      
      mockWebSocket.readyState = 1
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event)
      }
      
      await waitFor(() => {
        const messageInput = screen.getByPlaceholderText('メッセージを入力...')
        expect(messageInput).not.toBeDisabled()
      })
      
      const messageInput = screen.getByPlaceholderText('メッセージを入力...')
      
      await user.type(messageInput, 'Hello World')
      await user.keyboard('{Enter}')
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          username: 'testuser',
          content: 'Hello World'
        })
      )
    })

    it('clears message input after sending', async () => {
      const user = userEvent.setup()
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event)
      }
      
      const messageInput = screen.getByPlaceholderText('メッセージを入力...')
      
      await user.type(messageInput, 'Hello World')
      await user.keyboard('{Enter}')
      
      expect(messageInput).toHaveValue('')
    })

    it('displays received messages', async () => {
      const testMessage = {
        id: 'test-id',
        username: 'otheruser',
        content: 'Hello from other user',
        timestamp: '2025-01-01T12:00:00.000Z'
      }
      
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(testMessage)
        } as MessageEvent)
      }
      
      await waitFor(() => {
        expect(screen.getByText('Hello from other user')).toBeInTheDocument()
        expect(screen.getByText('otheruser')).toBeInTheDocument()
      })
    })

    it('styles own messages differently', async () => {
      const ownMessage = {
        id: 'test-id',
        username: 'testuser',
        content: 'My message',
        timestamp: '2025-01-01T12:00:00.000Z'
      }
      
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(ownMessage)
        } as MessageEvent)
      }
      
      await waitFor(() => {
        expect(screen.getByText('My message')).toBeInTheDocument()
        const messageContainer = screen.getByText('My message').closest('.max-w-xs')
        expect(messageContainer).toHaveClass('bg-blue-600')
        expect(messageContainer).toHaveClass('text-white')
      })
    })

    it('does not show username for own messages', async () => {
      const ownMessage = {
        id: 'test-id',
        username: 'testuser',
        content: 'My message',
        timestamp: '2025-01-01T12:00:00.000Z'
      }
      
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(ownMessage)
        } as MessageEvent)
      }
      
      await waitFor(() => {
        expect(screen.getByText('My message')).toBeInTheDocument()
      })
      
      expect(screen.queryByText('testuser')).not.toBeInTheDocument()
    })
  })

  describe('Utility Functions', () => {
    it('formats time correctly', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      const usernameInput = screen.getByPlaceholderText('ユーザー名')
      await user.type(usernameInput, 'testuser')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText('チャットルーム')).toBeInTheDocument()
      })
      
      const testMessage = {
        id: 'test-id',
        username: 'testuser',
        content: 'Test message',
        timestamp: '2025-01-01T15:30:00.000Z'
      }
      
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(testMessage)
        } as MessageEvent)
      }
      
      await waitFor(() => {
        const timeElement = screen.getByText(/\d{2}:\d{2}/)
        expect(timeElement).toBeInTheDocument()
      })
    })
  })

  describe('WebSocket Error Handling', () => {
    it('handles WebSocket connection errors', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      const usernameInput = screen.getByPlaceholderText('ユーザー名')
      await user.type(usernameInput, 'testuser')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText('チャットルーム')).toBeInTheDocument()
      })
      
      if (mockWebSocket.onerror) {
        mockWebSocket.onerror({} as Event)
      }
      
      await waitFor(() => {
        const statusIndicator = document.querySelector('.bg-red-500')
        expect(statusIndicator).toBeInTheDocument()
      })
    })

    it('handles WebSocket disconnection', async () => {
      const user = userEvent.setup()
      render(<App />)
      
      const usernameInput = screen.getByPlaceholderText('ユーザー名')
      await user.type(usernameInput, 'testuser')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText('チャットルーム')).toBeInTheDocument()
      })
      
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event)
      }
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({} as CloseEvent)
      }
      
      await waitFor(() => {
        const statusIndicator = document.querySelector('.bg-red-500')
        expect(statusIndicator).toBeInTheDocument()
      })
    })
  })
})
