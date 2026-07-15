import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LivePreview } from './LivePreview';

const CODE = `const Hello = () => <div>hi</div>;\nrender(<Hello />);`;

describe('LivePreview 뷰포트 토글', () => {
  it('기본값은 데스크탑이며 프레임에 제약이 없다', () => {
    const { container } = render(<LivePreview code={CODE} />);
    expect(screen.getByRole('button', { name: '데스크탑' })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.viewport-frame--desktop')).toBeTruthy();
  });

  it('모바일 버튼 클릭 시 모바일 프레임으로 전환된다', async () => {
    const user = userEvent.setup();
    const { container } = render(<LivePreview code={CODE} />);

    await user.click(screen.getByRole('button', { name: '모바일' }));

    expect(screen.getByRole('button', { name: '모바일' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '데스크탑' })).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('.viewport-frame--mobile')).toBeTruthy();
  });

  it('태블릿 버튼 클릭 시 태블릿 프레임으로 전환된다', async () => {
    const user = userEvent.setup();
    const { container } = render(<LivePreview code={CODE} />);

    await user.click(screen.getByRole('button', { name: '태블릿' }));

    expect(container.querySelector('.viewport-frame--tablet')).toBeTruthy();
  });
});
