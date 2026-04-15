import React, { useEffect, useRef } from 'react';
import { Alert } from 'antd';

interface ReadOnlyOperationsWrapperProps {
  enabled: boolean;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

const MUTATION_KEYWORDS = [
  'edit',
  'delete',
  'remove',
  'save',
  'create',
  'add',
  'update',
  'approve',
  'reject',
  'resend',
  'configure',
  'onboard',
];

function getActionText(el: Element): string {
  const htmlEl = el as HTMLElement;
  return (
    htmlEl.getAttribute('title') ||
    htmlEl.getAttribute('aria-label') ||
    htmlEl.textContent ||
    ''
  )
    .toLowerCase()
    .trim();
}

function isMutationAction(el: Element): boolean {
  const text = getActionText(el);
  return MUTATION_KEYWORDS.some((word) => text.includes(word));
}

const ReadOnlyOperationsWrapper: React.FC<ReadOnlyOperationsWrapperProps> = ({
  enabled,
  title = 'Read-only access',
  description = 'You can review data in this portal, but editing and delete actions are disabled for your account.',
  children,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !rootRef.current) return;
    const root = rootRef.current;
    const patched: Array<{ el: HTMLElement; attr: string; prev: string | null }> = [];

    const disableField = (el: HTMLElement, attr: 'disabled' | 'readonly') => {
      patched.push({ el, attr, prev: el.getAttribute(attr) });
      el.setAttribute(attr, 'true');
    };

    root.querySelectorAll('input, textarea, select').forEach((el) => {
      const element = el as HTMLElement;
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
        disableField(element, 'disabled');
      } else {
        disableField(element, 'readonly');
      }
    });

    root.querySelectorAll('button, a, [role="button"]').forEach((el) => {
      if (!isMutationAction(el)) return;
      const element = el as HTMLElement;
      if (element instanceof HTMLButtonElement) {
        disableField(element, 'disabled');
      } else {
        patched.push({ el: element, attr: 'style', prev: element.getAttribute('style') });
        element.style.pointerEvents = 'none';
        element.style.opacity = '0.6';
      }
    });

    const onClickCapture = (e: Event) => {
      const target = e.target as Element | null;
      if (!target) return;
      const actionEl = target.closest('button, a, [role="button"]');
      if (actionEl && isMutationAction(actionEl)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onSubmitCapture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    root.addEventListener('click', onClickCapture, true);
    root.addEventListener('submit', onSubmitCapture, true);

    return () => {
      root.removeEventListener('click', onClickCapture, true);
      root.removeEventListener('submit', onSubmitCapture, true);
      patched.forEach(({ el, attr, prev }) => {
        if (prev === null) {
          el.removeAttribute(attr);
        } else {
          el.setAttribute(attr, prev);
        }
      });
    };
  }, [enabled]);

  return (
    <div ref={rootRef}>
      {enabled && (
        <Alert
          type="info"
          showIcon
          message={title}
          description={description}
          style={{ marginBottom: 12 }}
        />
      )}
      {children}
    </div>
  );
};

export default ReadOnlyOperationsWrapper;
