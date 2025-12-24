import type { Meta, StoryObj } from '@storybook/react'
import { ToastProvider, useToast } from '../components/Toast'

const ToastDemo = () => {
  const { showToast } = useToast()

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => showToast('This is a success message!', 'success')}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white"
      >
        Show Success Toast
      </button>
      <button
        onClick={() => showToast('This is an error message!', 'error')}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
      >
        Show Error Toast
      </button>
      <button
        onClick={() => showToast('This is a warning message!', 'warning')}
        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white"
      >
        Show Warning Toast
      </button>
      <button
        onClick={() => showToast('This is an info message!', 'info')}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
      >
        Show Info Toast
      </button>
    </div>
  )
}

const meta: Meta = {
  title: 'Components/Toast',
  component: ToastDemo,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
}

export default meta
type Story = StoryObj

export const Interactive: Story = {
  render: () => <ToastDemo />,
}
