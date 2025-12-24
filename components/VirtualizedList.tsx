'use client'

import { useRef, useState, useEffect, useCallback, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  overscan?: number
  onEndReached?: () => void
  endReachedThreshold?: number
  emptyMessage?: string
  loading?: boolean
  loadingComponent?: ReactNode
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  className,
  overscan = 5,
  onEndReached,
  endReachedThreshold = 0.8,
  emptyMessage = 'No items to display',
  loading = false,
  loadingComponent,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  // Calculate visible range
  const totalHeight = items.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )
  const visibleItems = items.slice(startIndex, endIndex)
  const offsetY = startIndex * itemHeight

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    setScrollTop(scrollTop)

    // Check if near end
    if (onEndReached) {
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight
      if (scrollPercentage >= endReachedThreshold) {
        onEndReached()
      }
    }
  }, [onEndReached, endReachedThreshold])

  // Update container height on resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(container)
    setContainerHeight(container.clientHeight)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  if (items.length === 0 && !loading) {
    return (
      <div className={cn('flex items-center justify-center p-8 text-zinc-400', className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
      {loading && (
        loadingComponent || (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent" />
          </div>
        )
      )}
    </div>
  )
}

// Specialized list for chat messages with variable heights
interface ChatMessage {
  id: string
  content: string
  username: string
  timestamp: string
}

interface VirtualizedChatProps {
  messages: ChatMessage[]
  className?: string
  autoScroll?: boolean
}

export function VirtualizedChat({
  messages,
  className,
  autoScroll = true,
}: VirtualizedChatProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && isAtBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages.length, autoScroll, isAtBottom])

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      onScroll={handleScroll}
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className="p-2 border-b border-zinc-800 last:border-0"
        >
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-purple-400">{message.username}</span>
            <span className="text-xs text-zinc-500">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-zinc-300 text-sm mt-1">{message.content}</p>
        </div>
      ))}
    </div>
  )
}

// Grid variant for battle cards or user profiles
interface VirtualizedGridProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  columns?: number
  rowHeight: number
  className?: string
  gap?: number
  onEndReached?: () => void
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  columns = 3,
  rowHeight,
  className,
  gap = 16,
  onEndReached,
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  const rowCount = Math.ceil(items.length / columns)
  const totalHeight = rowCount * (rowHeight + gap) - gap

  const startRow = Math.max(0, Math.floor(scrollTop / (rowHeight + gap)) - 2)
  const endRow = Math.min(
    rowCount,
    Math.ceil((scrollTop + containerHeight) / (rowHeight + gap)) + 2
  )

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    setScrollTop(scrollTop)

    if (onEndReached && (scrollTop + clientHeight) / scrollHeight >= 0.8) {
      onEndReached()
    }
  }, [onEndReached])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(container)
    setContainerHeight(container.clientHeight)

    return () => resizeObserver.disconnect()
  }, [])

  const visibleRows: ReactNode[] = []
  for (let row = startRow; row < endRow; row++) {
    const rowItems: ReactNode[] = []
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col
      if (index < items.length) {
        rowItems.push(
          <div key={col} style={{ flex: 1 }}>
            {renderItem(items[index], index)}
          </div>
        )
      }
    }
    visibleRows.push(
      <div
        key={row}
        style={{
          position: 'absolute',
          top: row * (rowHeight + gap),
          left: 0,
          right: 0,
          height: rowHeight,
          display: 'flex',
          gap,
        }}
      >
        {rowItems}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleRows}
      </div>
    </div>
  )
}
