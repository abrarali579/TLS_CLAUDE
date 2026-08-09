/**
 * Characterization tests for the rate engine: rateMap / findRate / invoiceRate.
 * These decide what a customer gets charged, so they are the highest-risk
 * functions in the app to refactor.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { bootApp } from './harness.js';

let app, sampleItem, sampleRate;
beforeAll(async () => {
  app = await bootApp('suite');
  const map = app.rateMap();
  sampleItem = Object.keys(map)[0];
  sampleRate = map[sampleItem];
});

describe('rateMap', () => {
  it('indexes every master rate by UPPERCASE item name', () => {
    const map = app.rateMap();
    expect(Object.keys(map).length).toBeGreaterThan(50);
    for (const key of Object.keys(map)) expect(key).toBe(key.toUpperCase());
  });

  it('gives each entry a numeric rate, fee and a master source', () => {
    expect(sampleRate).toMatchObject({ src: 'master' });
    expect(typeof sampleRate.rate).toBe('number');
    expect(typeof sampleRate.fee).toBe('number');
  });

  it('keeps the FIRST entry when an item name appears twice', () => {
    // rateMap does `if(k && !RATE_MAP[k])`, so duplicates do not overwrite.
    const dupItem = 'ZZ DUPLICATE TEST';
    const before = app.D.rates.slice();
    app.D.rates.push({ item: dupItem, rate: 10, fee: 1 });
    app.D.rates.push({ item: dupItem, rate: 999, fee: 9 });
    app.rateBust();
    expect(app.findRate(dupItem)).toMatchObject({ rate: 10, fee: 1 });
    app.D.rates = before;
    app.rateBust();
  });
});

describe('findRate', () => {
  it('matches an exact item name', () => {
    expect(app.findRate(sampleItem)).toEqual(sampleRate);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(app.findRate(sampleItem.toLowerCase())).toEqual(sampleRate);
    expect(app.findRate(`   ${sampleItem}  `)).toEqual(sampleRate);
  });

  it('matches when punctuation differs', () => {
    // Falls back to a normalised compare: non-alphanumerics become spaces.
    const punctuated = sampleItem.replace(/ /g, '  -  ');
    expect(app.findRate(punctuated)).toEqual(sampleRate);
  });

  it('ignores an Arabic suffix after a dash', () => {
    // Descriptions arrive as "SERVICE NAME - <arabic>"; only the part before
    // the dash is used for lookup.
    expect(app.findRate(`${sampleItem} - عربي`)).toEqual(sampleRate);
  });

  it('returns null for unknown or empty descriptions', () => {
    for (const bad of ['NO SUCH ITEM AT ALL', '', null, undefined, '   ']) {
      expect(app.findRate(bad)).toBeNull();
    }
  });
});

describe('invoiceRate', () => {
  it('prefers an explicit template rate over the master rate', () => {
    expect(app.invoiceRate(sampleItem, 99)).toEqual({ rate: 99, src: 'template' });
  });

  it('falls back to the master rate when the template rate is blank or zero', () => {
    expect(app.invoiceRate(sampleItem, null)).toEqual({ rate: sampleRate.rate, src: 'master' });
    expect(app.invoiceRate(sampleItem, 0)).toEqual({ rate: sampleRate.rate, src: 'master' });
  });

  it('returns zero with src "none" when nothing matches — it never guesses', () => {
    expect(app.invoiceRate('NO SUCH ITEM AT ALL', null)).toEqual({ rate: 0, src: 'none' });
  });
});
