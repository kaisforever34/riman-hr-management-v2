import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../select'

describe('Select value label resolution', () => {
  it('shows the selected item label instead of the raw value (CUID)', () => {
    render(
      <Select value="cm123abcdef456">
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cm123abcdef456">John Doe</SelectItem>
          <SelectItem value="cm789ghijkl012">Jane Smith</SelectItem>
        </SelectContent>
      </Select>,
    )

    expect(screen.getByText('John Doe')).toBeDefined()
    expect(screen.queryByText('cm123abcdef456')).toBeNull()
  })

  it('resolves labels for multi-word children built from expressions', () => {
    const first = 'Sarah'
    const last = 'Connor'
    render(
      <Select value="id-1">
        <SelectTrigger>
          <SelectValue placeholder="Employee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="id-1">
            {first} {last}
          </SelectItem>
        </SelectContent>
      </Select>,
    )

    expect(screen.getByText('Sarah Connor')).toBeDefined()
    expect(screen.queryByText('id-1')).toBeNull()
  })

  it('shows the placeholder when nothing is selected', () => {
    render(
      <Select value="">
        <SelectTrigger>
          <SelectValue placeholder="Choose a status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PENDING">Pending</SelectItem>
        </SelectContent>
      </Select>,
    )

    expect(screen.getByText('Choose a status')).toBeDefined()
  })
})
