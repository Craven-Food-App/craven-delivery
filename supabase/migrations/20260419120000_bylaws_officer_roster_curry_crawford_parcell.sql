-- Bylaws officer roster updates:
-- Nathan Curry is no longer Chief Technology Officer (CTO line vacant).
-- Terri Crawford remains CXO; appointment documents not yet executed.
-- Jason Parcell is Chief Partnership Officer (CPO).

UPDATE public.document_templates
SET
  html_content = regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            html_content,
            '<li><strong>Chief Technology Officer:</strong> Nathan Curry</li>',
            '<li><strong>Chief Technology Officer:</strong> Vacant</li>',
            'gi'
          ),
          '<li><strong>Chief Technology Officer:</strong> To be appointed by the Board</li>',
          '<li><strong>Chief Technology Officer:</strong> Vacant</li>',
          'gi'
        ),
        '<li><strong>Chief Experience Officer:</strong> Terri Crawford</li>',
        '<li><strong>Chief Experience Officer:</strong> Terri Crawford <span style="font-style:italic">(appointment documents not yet executed)</span></li>',
        'gi'
      ),
      '<li><strong>Chief Experience Officer:</strong> To be appointed by the Board</li>',
      '<li><strong>Chief Experience Officer:</strong> Terri Crawford <span style="font-style:italic">(appointment documents not yet executed)</span></li>',
      'gi'
    ),
    '<li><strong>Chief Product Officer:</strong> Jason Parcell</li>',
    '<li><strong>Chief Partnership Officer:</strong> Jason Parcell</li>',
    'gi'
  ),
  updated_at = now()
WHERE template_key = 'bylaws_complete';

-- Add Chief Partnership Officer (Jason Parcell) after CFO when not already present
UPDATE public.document_templates
SET
  html_content = regexp_replace(
    html_content,
    '(<li><strong>Chief Financial Officer:</strong>\s*Justin Sweet</li>)',
    '\1' || chr(10) || '    <li><strong>Chief Partnership Officer:</strong> Jason Parcell</li>',
    'gi'
  ),
  updated_at = now()
WHERE template_key = 'bylaws_complete'
  AND html_content !~* 'Chief Partnership Officer';
