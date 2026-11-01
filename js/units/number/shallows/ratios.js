/* Polycodex v10 unit — Number Reef · Shallows · Ratios.
   Status: reviewed (content review recorded in ratios.review.md; human sign-off pending).
   Pipeline contract C1. Never edit a published unit in place; bump rev. */
(function () {
  'use strict';
  var unit = {
    id: 'number-shallows-ratios',
    v: 1,
    rev: 1,
    reef: 'number',
    zone: 'shallows',
    title: 'Ratios',
    est: 45,
    objectives: [
      'Describe a ratio as part-to-part or part-to-whole.',
      'Make equivalent ratios by multiplying or dividing both quantities.',
      'Find and use a unit rate.',
      'Scale a ratio to solve a real problem.'
    ],
    prereqs: [],
    standards: [
      { fw: 'CCSS', code: '6.RP.A.1' },
      { fw: 'CCSS', code: '6.RP.A.2' },
      { fw: 'CCSS', code: '6.RP.A.3' }
    ],
    sources: [
      { title: 'OpenStax Prealgebra 2e, Ratios and Rates', url: 'https://openstax.org/books/prealgebra-2e/pages/5-6-ratios-and-rate' },
      { title: 'Illustrative Mathematics, Grade 6 Ratios', url: 'https://illustrativemathematics.org/' }
    ],
    objectiveCoverage: [
      { objective: 0, checks: ['ratios-d1:d1k1', 'ratios-d2:d2k2'] },
      { objective: 1, checks: ['ratios-d1:d1k2', 'ratios-d2:d2k1'] },
      { objective: 2, checks: ['ratios-d3:d3k1', 'ratios-d5:d5k1'] },
      { objective: 3, checks: ['ratios-d4:d4k1', 'ratios-d5:d5k2'] }
    ],
    flags: { math: true, code: false },
    status: 'reviewed',
    reviewedBy: 'Codex content review',
    reviewedAt: '2026-10-28',
    dives: [
      /* ------------------------------------------------------------ DIVE 1 */
      {
        id: 'ratios-d1',
        rev: 1,
        title: 'What a ratio is',
        est: 7,
        hook: 'A recipe says 2 cups flour to 1 cup milk. That pair is a ratio: a fixed comparison, not a serving size.',
        cards: [
          {
            id: 'c1',
            kind: 'concept',
            title: 'A ratio compares two amounts',
            body: 'A ratio puts two quantities side by side. You can write 2 cups flour to 1 cup milk as 2:1, as 2 to 1, or as the fraction 2/1. The order matters. Flour to milk is 2:1. Milk to flour is 1:2.',
            visual: { type: 'bars', a: 2, b: 1, labelA: 'flour', labelB: 'milk', unit: 'cups', alt: 'Two amber bars for flour beside one pale bar for milk.' },
            concepts: ['num.ratio.meaning'],
            prompt: {
              id: 'p1', type: 'choose',
              q: 'A mix uses 2 cups flour and 1 cup milk. Which ratio is flour to milk?',
              opts: ['2:1', '1:2', '3:1', '1:3'], a: 0,
              why: 'Flour comes first, so write 2 first and milk second: 2:1.',
              why_wrong: { '1': 'This is milk to flour. The order is reversed.', '2': '3 is the total, not the flour amount.', '3': '1:3 compares milk to the total, not flour to milk.' },
              hints: ['Read the order in the question: flour, then milk.']
            }
          },
          {
            id: 'c2',
            kind: 'concept',
            title: 'Part-to-part, or part-to-whole',
            body: 'Flour to milk is part-to-part: 2:1. Flour to the whole mix is part-to-whole: 2:3, because 2 + 1 = 3 cups in all. Both are useful. Choose the one that answers the question being asked.',
            visual: { type: 'bars', a: 2, b: 1, total: true, labelA: 'flour', labelB: 'milk', alt: 'Two flour bars and one milk bar, with the three bars bracketed as the whole.' },
            concepts: ['num.ratio.meaning'],
            prompt: {
              id: 'p2', type: 'choose',
              q: 'In the 2:1 mix, what is milk to the whole mix?',
              opts: ['1:2', '1:3', '2:3', '3:1'], a: 1,
              why: 'There is 1 cup milk out of 3 cups total, so milk to whole is 1:3.',
              why_wrong: { '0': '1:2 compares milk to flour, not to the whole.', '2': '2:3 is flour to whole.', '3': '3:1 starts with the total and compares it to milk.' }
            }
          },
          {
            id: 'c3',
            kind: 'worked',
            title: 'Scale a batch',
            body: 'One batch uses 2 cups flour and 1 cup milk. To make two batches, double both amounts: 4 cups flour and 2 cups milk. The ratio is still 2:1, even though the amounts changed. The steps: multiply each part by the same number.',
            steps: ['Start with 2:1.', 'Multiply both parts by 2.', 'Get 4:2.', 'Divide both parts by 2 to return to 2:1.'],
            concepts: ['num.ratio.meaning', 'num.ratio.equivalent'],
            prompt: {
              id: 'p3', type: 'fill',
              q: 'Double a 2:1 mix. Write the new flour to milk ratio.',
              accept: ['4:2', '4 to 2', '4/2'],
              why: 'Doubling both parts gives 4 cups flour to 2 cups milk, or 4:2.',
              why_wrong: {}
            }
          },
          {
            id: 'c4',
            kind: 'concept',
            title: 'Ratios are not always counts',
            body: 'A ratio can compare measurements with different units. A car that travels 120 km in 2 hours has a ratio of 120 km to 2 hours. That is a rate. You will meet rates in Dive 3. For now, the key idea is the same: two amounts, compared in order.',
            concepts: ['num.ratio.meaning', 'num.ratio.rate'],
            prompt: {
              id: 'p4', type: 'predict',
              q: 'A sign says 3 swimmers to 1 lifeguard. Is that part-to-part or part-to-whole?',
              opts: ['Part-to-part', 'Part-to-whole'], a: 0,
              why: 'Swimmers and lifeguards are separate groups, so 3:1 compares one part with another part.',
              why_wrong: { '1': 'The whole would include swimmers and lifeguards together, 3:4.' }
            }
          }
        ],
        practice: {
          template: 'sort',
          room: 'kitchen',
          params: {
            prompt: 'Sort each statement into the right kind of comparison.',
            bins: [
              { id: 'part', label: 'Part-to-part' },
              { id: 'whole', label: 'Part-to-whole' }
            ],
            items: [
              { id: 's1', text: '2 cups flour for every 1 cup milk', bin: 'part' },
              { id: 's2', text: '2 cups flour out of 3 cups mix', bin: 'whole' },
              { id: 's3', text: '3 red beads to 5 blue beads', bin: 'part' },
              { id: 's4', text: '5 blue beads out of 8 beads', bin: 'whole' }
            ]
          }
        },
        check: [
          {
            id: 'd1k1',
            q: 'A paint mix uses 3 parts blue to 2 parts yellow. What does the 3 compare?',
            opts: ['Blue parts', 'Total parts', 'Yellow parts', 'Blue parts minus yellow parts'], a: 0,
            why: 'The number before the colon names the first quantity: 3 parts blue.',
            why_wrong: { '1': 'The total is 5 parts. 3 is one part of that total.', '2': 'Yellow is the second number, 2.', '3': 'A ratio compares amounts; it does not subtract them.' },
            concept: 'num.ratio.meaning'
          },
          {
            id: 'd1k2',
            q: 'Which fraction is equivalent to 2/3?',
            opts: ['4/6', '2/6', '3/2', '4/5'], a: 0,
            why: 'Multiply the top and bottom of 2/3 by 2 to get 4/6.',
            why_wrong: { '1': 'Only the top was doubled.', '2': 'This flips the fraction.', '3': 'The bottom changed by 2 but the top changed by 2 as well: 2/3 becomes 4/6, not 4/5.' },
            concept: 'num.fraction.equivalent'
          },
          {
            id: 'd1k3',
            q: 'What is 1/2 of 10?',
            opts: ['5', '2', '10', '20'], a: 0,
            why: 'Half of 10 is 5.',
            why_wrong: { '1': 'This is 10 divided by 5, not by 2.', '2': 'This keeps the whole instead of taking half.', '3': 'This doubles 10.' },
            concept: 'num.fraction.of'
          }
        ],
        review: [
          { id: 'r1', front: 'What does the ratio 2:5 compare?', back: '2 of the first quantity for every 5 of the second. It is part-to-part unless the 5 is the total.', concept: 'num.ratio.meaning' },
          { id: 'r2', front: 'A mix is 2 cups flour and 1 cup milk. Write flour to whole.', back: '2:3, because the whole is 2 + 1 = 3 cups.', concept: 'num.ratio.meaning' },
          { id: 'r3', front: 'How do you keep a ratio the same when you double a recipe?', back: 'Multiply both quantities by 2.', concept: 'num.ratio.equivalent' }
        ],
        collect: {
          id: 'measuring-cup',
          name: 'Brass measuring cup',
          art: 'cup',
          fact: 'A standard US cup is about 237 millilitres. The cup is a volume measure, so it can compare flour, milk, or sand.',
          source: 'NIST Handbook 44, Appendix C'
        }
      },

      /* ------------------------------------------------------------ DIVE 2 */
      {
        id: 'ratios-d2',
        rev: 1,
        title: 'Equivalent ratios',
        est: 8,
        hook: 'Two lemonade recipes can taste the same at different sizes. Their ratios are equivalent.',
        cards: [
          {
            id: 'c1',
            kind: 'concept',
            title: 'Multiply both parts',
            body: 'Start with 2 parts lemon to 3 parts water. Multiply both by 4 and you get 8:12. The mix tastes the same because every part grew by the same factor. Multiplying both quantities by the same non-zero number makes an equivalent ratio.',
            visual: { type: 'table', head: ['lemon', 'water'], rows: [['2', '3'], ['×4', '×4'], ['8', '12']], alt: 'A table showing 2 and 3 multiplied by 4 to make 8 and 12.' },
            concepts: ['num.ratio.equivalent'],
            prompt: {
              id: 'p1', type: 'fill',
              q: 'Multiply 3:4 by 3. Write the new ratio.',
              accept: ['9:12', '9 to 12', '9/12'],
              why: '3 × 3 = 9 and 4 × 3 = 12, so the equivalent ratio is 9:12.',
              why_wrong: {}
            }
          },
          {
            id: 'c2',
            kind: 'formula',
            title: 'Divide to simplify',
            body: 'You can also divide both parts by a common factor. The ratio 10:15 divides by 5 to become 2:3. A ratio is fully simplified when the two whole numbers share no factor greater than 1.',
            formula: '\\frac{10}{15}=\\frac{10\\div 5}{15\\div 5}=\\frac{2}{3}',
            mathDesc: 'Ten fifteenths equals ten divided by five over fifteen divided by five, which equals two thirds.',
            concepts: ['num.ratio.equivalent'],
            prompt: {
              id: 'p2', type: 'choose',
              q: 'Simplify 12:18 by dividing both parts by 6.',
              opts: ['2:3', '3:2', '6:12', '1:6'], a: 0,
              why: '12 ÷ 6 = 2 and 18 ÷ 6 = 3, so the simplified ratio is 2:3.',
              why_wrong: { '1': 'The order is reversed.', '2': 'Only one part was divided by 6.', '3': 'This divides 12 by 12 and 18 by 3, not both by 6.' }
            }
          },
          {
            id: 'c3',
            kind: 'worked',
            title: 'Check with cross products',
            body: 'Are 4:6 and 6:9 equivalent? Compare the products diagonally. 4 × 9 = 36 and 6 × 6 = 36. Equal products mean the ratios are equivalent. This works because both ratios simplify to 2:3.',
            steps: ['Write the ratios as fractions: 4/6 and 6/9.', 'Cross multiply: 4 × 9 and 6 × 6.', 'Both equal 36.', 'The ratios are equivalent.'],
            concepts: ['num.ratio.equivalent'],
            prompt: {
              id: 'p3', type: 'choose',
              q: 'Which pair is equivalent?',
              opts: ['5:7 and 10:14', '5:7 and 7:5', '5:7 and 6:8', '5:7 and 10:12'], a: 0,
              why: 'Multiplying 5:7 by 2 gives 10:14.',
              why_wrong: { '1': 'This reverses the order.', '2': '6:8 simplifies to 3:4, not 5:7.', '3': '10:12 simplifies to 5:6.' }
            }
          },
          {
            id: 'c4',
            kind: 'figure',
            title: 'A double number line',
            body: 'A double number line lines up two quantities. Every marked pair is an equivalent ratio. At 1 batch you use 3 cups. At 2 batches you use 6 cups. At 3 batches you use 9 cups. The lines move together, so the ratio stays 3:1.',
            visual: { type: 'double-line', aLabel: 'batches', bLabel: 'cups', pairs: [[1, 3], [2, 6], [3, 9]], alt: 'Two parallel number lines: 1, 2, 3 batches above and 3, 6, 9 cups below.' },
            concepts: ['num.ratio.equivalent'],
            prompt: {
              id: 'p4', type: 'choose',
              q: 'On the double number line, how many cups go with 4 batches?',
              opts: ['12', '9', '10', '7'], a: 0,
              why: 'Each batch adds 3 cups. Four batches need 4 × 3 = 12 cups.',
              why_wrong: { '1': '9 cups goes with 3 batches.', '2': 'The pattern adds 3, not 1.', '3': '7 skips the pattern.' }
            }
          }
        ],
        practice: {
          template: 'sequence',
          room: 'kitchen',
          params: {
            prompt: 'Put the steps for checking equivalent ratios in order.',
            steps: [
              { id: 'a', text: 'Write both ratios as fractions.' },
              { id: 'b', text: 'Cross multiply.' },
              { id: 'c', text: 'Compare the two products.' },
              { id: 'd', text: 'If the products match, the ratios are equivalent.' }
            ],
            order: ['a', 'b', 'c', 'd']
          }
        },
        check: [
          {
            id: 'd2k1',
            q: 'Which ratio is equivalent to 7:4?',
            opts: ['14:8', '8:14', '7:8', '14:4'], a: 0,
            why: 'Multiply both parts by 2: 7 × 2 = 14 and 4 × 2 = 8.',
            why_wrong: { '1': 'The order is reversed.', '2': 'Only the second part was doubled.', '3': 'Only the first part was doubled.' },
            concept: 'num.ratio.equivalent'
          },
          {
            id: 'd2k2',
            q: 'A trail mix is 2 parts nuts to 5 parts raisins. What is nuts to the whole mix?',
            opts: ['2:7', '2:5', '5:7', '5:2'], a: 0,
            why: 'The whole is 2 + 5 = 7 parts, so nuts to whole is 2:7.',
            why_wrong: { '1': 'This is nuts to raisins, part-to-part.', '2': '5:7 is raisins to whole.', '3': 'This compares raisins to nuts.' },
            concept: 'num.ratio.meaning'
          },
          {
            id: 'd2k3',
            q: 'What is 2/3 of 12?',
            opts: ['8', '4', '6', '9'], a: 0,
            why: 'One third of 12 is 4, so two thirds is 8.',
            why_wrong: { '1': '4 is one third, not two thirds.', '2': '6 is one half.', '3': '9 is three quarters of 12.' },
            concept: 'num.fraction.of'
          }
        ],
        review: [
          { id: 'r1', front: 'How do you make an equivalent ratio?', back: 'Multiply or divide both quantities by the same non-zero number.', concept: 'num.ratio.equivalent' },
          { id: 'r2', front: 'Simplify 20:25.', back: 'Divide both by 5 to get 4:5.', concept: 'num.ratio.equivalent' },
          { id: 'r3', front: 'What do equal cross products tell you?', back: 'The two ratios are equivalent.', concept: 'num.ratio.equivalent' }
        ],
        collect: {
          id: 'recipe-card',
          name: 'Laminated recipe card',
          art: 'card',
          fact: 'Recipes are ratios in disguise. Scaling a recipe is multiplying every ingredient by the same factor.',
          source: 'OpenStax Prealgebra 2e, section 5.6'
        }
      },

      /* ------------------------------------------------------------ DIVE 3 */
      {
        id: 'ratios-d3',
        rev: 1,
        title: 'Rates and unit rates',
        est: 8,
        hook: 'A train covers 120 kilometres in 2 hours. That is a rate: a ratio with different units.',
        cards: [
          {
            id: 'c1',
            kind: 'concept',
            title: 'A rate compares different units',
            body: 'A rate is a ratio that compares quantities measured in different units: kilometres per hour, dollars per kilogram, words per minute. The word per usually signals a rate. 120 km in 2 hours is the rate 120 km : 2 h.',
            visual: { type: 'bars', a: 120, b: 2, labelA: 'kilometres', labelB: 'hours', alt: 'A long bar for 120 kilometres above a short bar for 2 hours.' },
            concepts: ['num.ratio.rate'],
            prompt: {
              id: 'p1', type: 'choose',
              q: 'Which of these is a rate?',
              opts: ['90 km per 3 hours', '3 red tokens to 2 blue tokens', '5 students out of 30', '2 cups flour to 1 cup milk'], a: 0,
              why: 'Kilometres and hours are different units, so this is a rate.',
              why_wrong: { '1': 'Both counts use tokens, so this is part-to-part.', '2': 'Both quantities are students, so this is part-to-whole.', '3': 'Both quantities are cups, so this is part-to-part.' }
            }
          },
          {
            id: 'c2',
            kind: 'worked',
            title: 'Find the unit rate',
            body: 'A unit rate compares to 1 of the second quantity. Divide both parts by the second number. For 120 km in 2 hours, divide by 2: 60 km to 1 hour. The unit rate is 60 kilometres per hour. Unit rates make comparisons easy.',
            steps: ['Start with 120 km : 2 h.', 'Divide both parts by 2.', 'Get 60 km : 1 h.', 'Read it as 60 kilometres per hour.'],
            concepts: ['num.ratio.rate'],
            prompt: {
              id: 'p2', type: 'fill',
              q: 'A pack of 5 notebooks costs $15. What is the cost per notebook in dollars?',
              accept: ['3', '$3', '3.00', '$3.00'],
              why: '$15 ÷ 5 = $3 per notebook.',
              why_wrong: {}
            }
          },
          {
            id: 'c3',
            kind: 'concept',
            title: 'Compare with unit rates',
            body: 'Shop A sells 4 kg of rice for $12. Shop B sells 6 kg for $15. Unit rates: A is $3 per kg, B is $2.50 per kg. Shop B is cheaper per kilogram even though its total price is higher. Totals hide the comparison. Unit rates reveal it.',
            visual: { type: 'table', head: ['shop', 'price', 'mass', 'per kg'], rows: [['A', '$12', '4 kg', '$3.00'], ['B', '$15', '6 kg', '$2.50']], alt: 'A table comparing two rice shops by price per kilogram.' },
            concepts: ['num.ratio.rate', 'num.ratio.compare'],
            prompt: {
              id: 'p3', type: 'choose',
              q: 'Which is the better buy per gram?',
              opts: ['300 g for $6', '500 g for $12', 'Neither, they are equal', 'Not enough information'], a: 0,
              why: '$6 ÷ 300 g = $0.02 per gram. $12 ÷ 500 g = $0.024 per gram. The first is cheaper.',
              why_wrong: { '1': 'The larger pack costs more per gram.', '2': 'The unit rates are 2 cents and 2.4 cents.', '3': 'Both price and mass are given.' }
            }
          },
          {
            id: 'c4',
            kind: 'concept',
            title: 'Rates can be fractions',
            body: 'A rate can have a fraction in it. If you read 3/4 of a book in 1/2 hour, divide by 1/2 to find the rate per hour. Dividing by 1/2 is the same as multiplying by 2, so the rate is 1 1/2 books per hour. Fractions do not change the rule.',
            concepts: ['num.ratio.rate'],
            prompt: {
              id: 'p4', type: 'choose',
              q: 'You walk 1/2 km in 1/4 hour. What is your speed in km per hour?',
              opts: ['2 km per hour', '1/8 km per hour', '1/2 km per hour', '4 km per hour'], a: 0,
              why: 'Divide 1/2 by 1/4: 1/2 × 4 = 2 km per hour.',
              why_wrong: { '1': 'This multiplies the two fractions instead of dividing.', '2': 'This keeps the distance and ignores the time.', '3': 'This multiplies by 8, not 4.' }
            }
          }
        ],
        wreck: ['s1-1'],
        practice: {
          template: 'tune',
          room: 'kitchen',
          params: {
            prompt: 'The recipe makes 2 servings. Scale it to 5 servings.',
            from: 2,
            to: 5,
            unitLabel: 'servings',
            ingredients: [
              { name: 'rice', amount: 1, unit: 'cup' },
              { name: 'stock', amount: 2, unit: 'cups' },
              { name: 'lemon', amount: 1, unit: 'whole' }
            ]
          }
        },
        check: [
          {
            id: 'd3k1',
            q: 'A printer prints 48 pages in 4 minutes. What is its unit rate?',
            opts: ['12 pages per minute', '48 pages per minute', '4 pages per minute', '192 pages per minute'], a: 0,
            why: '48 ÷ 4 = 12 pages per minute.',
            why_wrong: { '1': 'This is the total, not the rate for one minute.', '2': 'This is the time, not the page count.', '3': 'This multiplies instead of dividing.' },
            concept: 'num.ratio.rate'
          },
          {
            id: 'd3k2',
            q: 'Which ratio is equivalent to 6:9?',
            opts: ['2:3', '3:2', '6:3', '9:6'], a: 0,
            why: 'Divide both parts by 3: 6 ÷ 3 = 2 and 9 ÷ 3 = 3.',
            why_wrong: { '1': 'This reverses the order.', '2': 'Only the second part was divided.', '3': 'This reverses the order and does not simplify correctly.' },
            concept: 'num.ratio.equivalent'
          },
          {
            id: 'd3k3',
            q: 'What is 3/4 of 20?',
            opts: ['15', '5', '12', '16'], a: 0,
            why: 'One quarter of 20 is 5, so three quarters is 15.',
            why_wrong: { '1': '5 is one quarter.', '2': '12 is three fifths of 20.', '3': '16 is four fifths of 20.' },
            concept: 'num.fraction.of'
          }
        ],
        review: [
          { id: 'r1', front: 'What is a unit rate?', back: 'A rate with 1 in the second quantity, such as 60 km per 1 hour.', concept: 'num.ratio.rate' },
          { id: 'r2', front: 'Find the unit rate: $18 for 6 pens.', back: '$3 per pen.', concept: 'num.ratio.rate' },
          { id: 'r3', front: 'Why compare unit rates instead of totals?', back: 'Totals hide the size of each pack. Unit rates put both offers on the same scale.', concept: 'num.ratio.compare' }
        ],
        collect: {
          id: 'scale-dial',
          name: 'Brass scale dial',
          art: 'dial',
          fact: 'A unit rate is a scale dial set to one. Once the dial reads per one, any size is easy to compare.',
          source: 'OpenStax Prealgebra 2e, section 5.6'
        }
      },

      /* ------------------------------------------------------------ DIVE 4 */
      {
        id: 'ratios-d4',
        rev: 1,
        title: 'Scaling a ratio',
        est: 8,
        hook: 'A map says 1 cm stands for 5 km. Measure 4 cm and you have 20 km: both parts grew by 4.',
        cards: [
          {
            id: 'c1',
            kind: 'concept',
            title: 'The scale factor',
            body: 'A scale factor is the number you multiply both parts by. On a 1:5 map, 1 cm becomes 5 km. A measurement of 4 cm scales by 4: 4 cm becomes 20 km. The ratio 1:5 stays the same; only the pair of amounts changes.',
            visual: { type: 'map', scale: '1 cm : 5 km', measured: 4, result: 20, alt: 'A map ruler showing 4 centimetres corresponding to 20 kilometres.' },
            concepts: ['num.ratio.scale'],
            prompt: {
              id: 'p1', type: 'fill',
              q: 'On a 1:5 map, how many kilometres is 7 cm?',
              accept: ['35', '35 km', '35 kilometres'],
              why: 'Multiply both parts by 7: 7 cm corresponds to 35 km.',
              why_wrong: {}
            }
          },
          {
            id: 'c2',
            kind: 'worked',
            title: 'Find a missing part',
            body: 'A recipe uses 3 cups flour for every 2 cups milk. You have 9 cups flour. What milk do you need? Flour grew from 3 to 9, a factor of 3. Multiply milk by the same factor: 2 × 3 = 6 cups. The missing part is 6.',
            steps: ['Write the ratio 3:2.', 'Find the factor from 3 to 9: 9 ÷ 3 = 3.', 'Multiply the other part by 3: 2 × 3 = 6.', 'The new ratio is 9:6, equivalent to 3:2.'],
            concepts: ['num.ratio.scale'],
            prompt: {
              id: 'p2', type: 'choose',
              q: 'A mix is 2:5 paint to water. You use 8 litres of paint. How much water?',
              opts: ['20 litres', '10 litres', '16 litres', '4 litres'], a: 0,
              why: 'Paint grew from 2 to 8, a factor of 4. Water is 5 × 4 = 20 litres.',
              why_wrong: { '1': 'This doubles the water but the paint grew by 4.', '2': 'This doubles 8 instead of scaling 5 by 4.', '3': 'This halves 8 instead of scaling.' }
            }
          },
          {
            id: 'c3',
            kind: 'interactive',
            title: 'Decode the scale label',
            body: 'Some labels hide the scale in symbols. Use the key to turn the symbols into numbers, then write the ratio.',
            template: 'decode',
            params: {
              prompt: 'A legend says ★ = 3 and ● = 5. Decode the ratio ★:●.',
              mapping: [{ symbol: '★', value: 3 }, { symbol: '●', value: 5 }],
              question: 'Write the decoded ratio.',
              answer: '3:5',
              accept: ['3:5', '3 to 5', '3/5']
            },
            concepts: ['num.ratio.scale'],
            prompt: {
              id: 'p3', type: 'choose',
              q: 'A scale says 2 cm : 10 km. How many kilometres is 6 cm?',
              opts: ['30 km', '12 km', '20 km', '60 km'], a: 0,
              why: '6 cm is 3 times 2 cm. Multiply 10 km by 3 to get 30 km.',
              why_wrong: { '1': 'This adds 6 and 6 instead of scaling.', '2': 'This doubles the map distance.', '3': 'This multiplies 10 by 6.' }
            }
          },
          {
            id: 'c4',
            kind: 'concept',
            title: 'Scale drawings keep shape',
            body: 'A scale drawing multiplies every length by the same factor. A room 4 m by 6 m drawn at 1:100 becomes 4 cm by 6 cm. The drawing is smaller, but the ratio of the sides is still 4:6, or 2:3. If you scaled only one side, the shape would stretch and stop being a faithful plan.',
            concepts: ['num.ratio.scale'],
            prompt: {
              id: 'p4', type: 'predict',
              q: 'A 2:3 rectangle is scaled by 5. What are its new side lengths if the originals are 2 cm and 3 cm?',
              opts: ['10 cm and 15 cm', '7 cm and 8 cm', '10 cm and 3 cm', '4 cm and 6 cm'], a: 0,
              why: 'Multiply both sides by 5: 2 × 5 = 10 and 3 × 5 = 15.',
              why_wrong: { '1': 'This adds 5 to each side instead of multiplying.', '2': 'Only one side was scaled.', '3': 'This doubles the sides, not times 5.' }
            }
          }
        ],
        practice: {
          template: 'estimate',
          room: 'archive',
          params: {
            prompt: 'The map scale is 1 cm : 5 km. Estimate the real distance for a 6.4 cm line.',
            min: 0,
            max: 50,
            step: 0.5,
            unit: 'km',
            value: 32,
            tol: 1.5
          }
        },
        check: [
          {
            id: 'd4k1',
            q: 'A model car is built at 1:24. The model is 18 cm long. How long is the real car?',
            opts: ['432 cm', '42 cm', '24 cm', '1.8 cm'], a: 0,
            why: 'Multiply by 24: 18 × 24 = 432 cm.',
            why_wrong: { '1': 'This adds 24 to 18.', '2': 'This keeps the scale number instead of scaling.', '3': 'This divides by 10.' },
            concept: 'num.ratio.scale'
          },
          {
            id: 'd4k2',
            q: 'A tap fills 15 litres in 3 minutes. What is the unit rate?',
            opts: ['5 litres per minute', '15 litres per minute', '3 litres per minute', '45 litres per minute'], a: 0,
            why: '15 ÷ 3 = 5 litres per minute.',
            why_wrong: { '1': 'This is the total, not the per-minute rate.', '2': 'This is the time.', '3': 'This multiplies instead of dividing.' },
            concept: 'num.ratio.rate'
          },
          {
            id: 'd4k3',
            q: 'Which fraction is equivalent to 3/5?',
            opts: ['9/15', '5/3', '6/15', '9/10'], a: 0,
            why: 'Multiply the top and bottom by 3: 3 × 3 = 9 and 5 × 3 = 15.',
            why_wrong: { '1': 'This flips the fraction.', '2': 'Only the top was multiplied by 2 and the bottom by 3.', '3': 'The bottom was doubled but the top was tripled.' },
            concept: 'num.fraction.equivalent'
          }
        ],
        review: [
          { id: 'r1', front: 'What is a scale factor?', back: 'The number both quantities in a ratio are multiplied by.', concept: 'num.ratio.scale' },
          { id: 'r2', front: 'A 1:50 plan shows 4 cm. What is the real length?', back: '200 cm, or 2 m.', concept: 'num.ratio.scale' },
          { id: 'r3', front: 'Why must every length in a scale drawing use the same factor?', back: 'Different factors would stretch the shape and change its proportions.', concept: 'num.ratio.scale' }
        ],
        collect: {
          id: 'map-scale',
          name: 'Folding map scale',
          art: 'map',
          fact: 'A map scale is a ratio printed on paper. The same ratio can describe a model, a recipe, or a photograph.',
          source: 'Ordnance Survey, Map reading made easy'
        }
      },

      /* ------------------------------------------------------------ DIVE 5 */
      {
        id: 'ratios-d5',
        rev: 1,
        title: 'Comparing ratios',
        est: 8,
        hook: 'Two orange drinks use different amounts. To judge which is more orange, put both ratios on the same scale.',
        cards: [
          {
            id: 'c1',
            kind: 'concept',
            title: 'Make the second number 1',
            body: 'Drink A is 3 parts concentrate to 4 parts water. Drink B is 5 parts concentrate to 7 parts water. Convert both to concentrate per 1 part water. A is 3 ÷ 4 = 0.75. B is 5 ÷ 7 ≈ 0.71. Drink A is more concentrated. Unit rates turn a comparison into a single number.',
            visual: { type: 'table', head: ['drink', 'concentrate', 'water', 'per 1 water'], rows: [['A', '3', '4', '0.75'], ['B', '5', '7', '≈0.71']], alt: 'A table comparing two drinks by concentrate per unit of water.' },
            concepts: ['num.ratio.compare'],
            prompt: {
              id: 'p1', type: 'choose',
              q: 'Which mix is stronger: 2 parts syrup to 5 parts water, or 3 parts syrup to 8 parts water?',
              opts: ['2:5', '3:8', 'They are equal', 'Not enough information'], a: 0,
              why: '2 ÷ 5 = 0.4 and 3 ÷ 8 = 0.375. The 2:5 mix has more syrup per part water.',
              why_wrong: { '1': '3:8 looks larger because both numbers are bigger, but the ratio is weaker.', '2': '0.4 is greater than 0.375.', '3': 'Both ratios are complete.' }
            }
          },
          {
            id: 'c2',
            kind: 'worked',
            title: 'Use a common term',
            body: 'You can also make one part match. Compare 4:6 and 6:9. Make the first numbers match at 12: multiply 4:6 by 3 to get 12:18, and 6:9 by 2 to get 12:18. They match, so the ratios are equivalent. This is the same move as finding a common denominator.',
            steps: ['Line up the two ratios: 4:6 and 6:9.', 'Choose a common first term, 12.', 'Scale 4:6 by 3 to get 12:18.', 'Scale 6:9 by 2 to get 12:18.', 'The scaled ratios match, so the originals are equivalent.'],
            concepts: ['num.ratio.compare', 'num.ratio.equivalent'],
            prompt: {
              id: 'p2', type: 'choose',
              q: 'Which is equivalent to 4:10?',
              opts: ['2:5', '5:2', '4:5', '8:10'], a: 0,
              why: 'Divide both parts by 2: 4 ÷ 2 = 2 and 10 ÷ 2 = 5.',
              why_wrong: { '1': 'This reverses the order.', '2': 'Only the second part was divided.', '3': 'Only the first part was doubled.' }
            }
          },
          {
            id: 'c3',
            kind: 'formula',
            title: 'A proportion is two equal ratios',
            body: 'A proportion states that two ratios are equal. If 3:4 = 9:x, cross multiply: 3x = 36, so x = 12. Proportions are the formal name for the scaling you have been doing.',
            formula: '\\frac{3}{4}=\\frac{9}{x}\\quad\\Rightarrow\\quad 3x=36\\quad\\Rightarrow\\quad x=12',
            mathDesc: 'Three fourths equals nine over x. Cross multiplying gives three x equals thirty-six, so x equals twelve.',
            concepts: ['num.ratio.compare'],
            prompt: {
              id: 'p3', type: 'fill',
              q: 'Solve the proportion 2:5 = 6:x. What is x?',
              accept: ['15', 'x=15', 'x = 15'],
              why: 'Cross multiply: 2x = 30, so x = 15.',
              why_wrong: {}
            }
          },
          {
            id: 'c4',
            kind: 'concept',
            title: 'A ratio is a tool, not a verdict',
            body: 'A ratio tells you how two quantities compare. It does not tell you whether the comparison is fair, safe, or good. A 1:10 teacher-to-student ratio describes a school. Whether that is the right ratio is a judgement, not a calculation. Keep the maths and the value judgement separate.',
            concepts: ['num.ratio.compare'],
            prompt: {
              id: 'p4', type: 'predict',
              q: 'Two towns have the same ratio of parks to people. Does that mean they have the same number of parks?',
              opts: ['No, the totals can differ', 'Yes, ratios fix the counts', 'Only if the towns are the same size', 'Only if both towns have 1 park'], a: 0,
              why: 'The same ratio can describe different total sizes, just as 2:3 and 20:30 are equivalent.',
              why_wrong: { '1': 'A ratio is a comparison, not a fixed count.', '2': 'Ratios can match even when town sizes differ, as long as both scale by the same factor.', '3': 'The ratio does not require a count of 1.' }
            }
          }
        ],
        wreck: ['s2-4', 's8-3'],
        practice: {
          template: 'balance',
          room: 'kitchen',
          params: {
            prompt: 'Balance the recipe. The left mix is 2 parts juice to 3 parts water. The right mix uses 4 parts juice. How much water keeps the same ratio?',
            left: { a: 2, b: 3 },
            right: { a: 4, b: null },
            options: [5, 6, 8, 9],
            answer: 6
          }
        },
        check: [
          {
            id: 'd5k1',
            q: 'Which is the stronger mix: 1 part cordial to 3 parts water, or 2 parts cordial to 7 parts water?',
            opts: ['1:3', '2:7', 'They are equal', 'Not enough information'], a: 0,
            why: '1 ÷ 3 ≈ 0.33 and 2 ÷ 7 ≈ 0.29. The 1:3 mix has more cordial per part water.',
            why_wrong: { '1': '2:7 looks stronger because both numbers are bigger, but 0.29 is less than 0.33.', '2': 'The unit rates are 0.33 and 0.29, so they differ.', '3': 'Both ratios are complete.' },
            concept: 'num.ratio.compare'
          },
          {
            id: 'd5k2',
            q: 'A 1:80 plan shows 5 cm. What is the real length in metres?',
            opts: ['4 m', '40 m', '400 m', '0.04 m'], a: 0,
            why: '5 × 80 = 400 cm, and 400 cm = 4 m.',
            why_wrong: { '1': 'This is 400 cm mistaken for 40 m.', '2': 'This multiplies by 80 twice.', '3': 'This divides instead of multiplying.' },
            concept: 'num.ratio.scale'
          },
          {
            id: 'd5k3',
            q: 'What is 5/6 of 18?',
            opts: ['15', '3', '12', '16'], a: 0,
            why: 'One sixth of 18 is 3, so five sixths is 15.',
            why_wrong: { '1': '3 is one sixth.', '2': '12 is two thirds of 18.', '3': '16 is eight ninths of 18.' },
            concept: 'num.fraction.of'
          }
        ],
        review: [
          { id: 'r1', front: 'How do you compare two ratios?', back: 'Turn both into unit rates, or scale them until one term matches.', concept: 'num.ratio.compare' },
          { id: 'r2', front: 'What is a proportion?', back: 'An equation saying two ratios are equal.', concept: 'num.ratio.compare' },
          { id: 'r3', front: 'Does a ratio decide whether a situation is fair?', back: 'No. It describes a comparison; fairness is a separate judgement.', concept: 'num.ratio.compare' }
        ],
        collect: {
          id: 'ratio-lens',
          name: 'Ratio lens',
          art: 'lens',
          fact: 'A unit rate is like a lens that makes different-sized mixes comparable. The numbers change; the comparison becomes clear.',
          source: 'OpenStax Prealgebra 2e, section 5.6'
        }
      }
    ],
    glossary: [
      { term: 'ratio', def: 'A comparison of two quantities by division, written a:b or a/b.', concept: 'num.ratio.meaning' },
      { term: 'part-to-part', def: 'A ratio that compares one part of a group with another part.', concept: 'num.ratio.meaning' },
      { term: 'part-to-whole', def: 'A ratio that compares one part with the total.', concept: 'num.ratio.meaning' },
      { term: 'equivalent ratios', def: 'Ratios that describe the same comparison, found by multiplying or dividing both parts by the same number.', concept: 'num.ratio.equivalent' },
      { term: 'rate', def: 'A ratio that compares quantities with different units.', concept: 'num.ratio.rate' },
      { term: 'unit rate', def: 'A rate with 1 in the second quantity.', concept: 'num.ratio.rate' },
      { term: 'scale factor', def: 'The number both parts of a ratio are multiplied by.', concept: 'num.ratio.scale' },
      { term: 'proportion', def: 'An equation stating that two ratios are equal.', concept: 'num.ratio.compare' }
    ]
  };
  if (window.CodexUnits && window.CodexUnits.register) window.CodexUnits.register(unit);
  else (window.__PENDING_UNITS__ = window.__PENDING_UNITS__ || []).push(unit);
})();
