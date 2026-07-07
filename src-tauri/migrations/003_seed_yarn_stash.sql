-- Initial yarn stash import (idempotent)
INSERT OR IGNORE INTO yarns (id, name, brand, fiber_content, weight, skeins_owned, color, color_feature, yardage_per_skein)
VALUES
  ('yarn_delft_heather',      'Delft Heather',      'Wool of the Andes', '80% peruvian highland wool, 20% Donegal Tweed', 'worsted',    3, 'Navy Blue',    'Tweed',      110),
  ('yarn_sprinkle_heather',   'Sprinkle Heather',   'Wool of the Andes', '100% peruvian highland wool',                   'sport',      1, 'Navy Blue',    'Tweed',      137),
  ('yarn_persimmon_heather',  'Persimmon Heather',  'Wool of the Andes', '100% superwash wool',                           'worsted',    4, 'Orange',       NULL,         110),
  ('yarn_rainbow_variegated', 'rainbow variegated', NULL,                '100% wool',                                     'dk',         0, NULL,           'Variegated', NULL),
  ('yarn_rainstorm_heather',  'Rainstorm Heather',  'Stroll',            '75% fine superwash merino, 25% nylon',          'fingering',  1, 'Teal Blue',    'Heather',    231),
  ('yarn_prairie_heather',    'Prairie Heather',    'Stroll',            '75% fine superwash merino, 25% nylon',          'fingering',  2, 'Teal Blue',    'Heather',    231),
  ('yarn_dashwood',           'Dashwood',           'Alpaca Cloud',      '100% baby alpaca',                              'lace',       3, 'Medium Brown', NULL,         440),
  ('yarn_cotlin',             'Cotlin',             'Cotlin',            'cotton; linen',                                 'dk',         3, 'White',        NULL,         NULL);
