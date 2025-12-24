import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from '../components/Avatar'

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    borderColor: {
      control: 'select',
      options: ['default', 'purple', 'green', 'red', 'gold'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Avatar>

export const Default: Story = {
  args: {
    src: 'https://api.dicebear.com/7.x/bottts/svg?seed=rapper1',
    alt: 'User Avatar',
    size: 'md',
  },
}

export const WithFallback: Story = {
  args: {
    src: '/invalid-image.jpg',
    alt: 'Fallback Avatar',
    size: 'md',
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Avatar
        src="https://api.dicebear.com/7.x/bottts/svg?seed=xs"
        alt="XS Avatar"
        size="xs"
      />
      <Avatar
        src="https://api.dicebear.com/7.x/bottts/svg?seed=sm"
        alt="SM Avatar"
        size="sm"
      />
      <Avatar
        src="https://api.dicebear.com/7.x/bottts/svg?seed=md"
        alt="MD Avatar"
        size="md"
      />
      <Avatar
        src="https://api.dicebear.com/7.x/bottts/svg?seed=lg"
        alt="LG Avatar"
        size="lg"
      />
      <Avatar
        src="https://api.dicebear.com/7.x/bottts/svg?seed=xl"
        alt="XL Avatar"
        size="xl"
      />
    </div>
  ),
}

export const BorderColors: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar
        src="https://api.dicebear.com/7.x/bottts/svg?seed=default"
        alt="Default Border"
        size="lg"
        borderColor="default"
      />
      <Avatar
        src="https://api.dicebear.com/7.x/bottts/svg?seed=purple"
        alt="Purple Border"
        size="lg"
        borderColor="purple"
      />
      <Avatar
        src="https://api.dicebear.com/7.x/bottts/svg?seed=green"
        alt="Green Border"
        size="lg"
        borderColor="green"
      />
      <Avatar
        src="https://api.dicebear.com/7.x/bottts/svg?seed=red"
        alt="Red Border"
        size="lg"
        borderColor="red"
      />
      <Avatar
        src="https://api.dicebear.com/7.x/bottts/svg?seed=gold"
        alt="Gold Border"
        size="lg"
        borderColor="gold"
      />
    </div>
  ),
}
