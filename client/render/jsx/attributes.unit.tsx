/**
 * @license
 * Copyright a-Qoot All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/a-Qoot/qoot/blob/main/LICENSE
 */

import { expect } from 'chai';
import { ComponentFixture } from '../../testing/component_fixture.js';
import { ElementFixture } from '../../testing/element_fixture.js';
import { createGlobal } from '../../testing/node_utils.js';
import { applyAttributes, setAttribute, stringifyClassOrStyle } from './attributes.js';
import { jsxFactory } from './factory.js';

const _needed_by_JSX_ = jsxFactory; // eslint-disable-line @typescript-eslint/no-unused-vars
describe('attributes', () => {
  let host: HTMLElement;
  let input: HTMLInputElement;
  beforeEach(() => {
    const global = createGlobal(import.meta.url);
    host = global.document.createElement('host');
    input = global.document.createElement('input');
  });

  describe('applyAttributes()', () => {
    it('should do nothing', () => {
      expect(applyAttributes(host, null, false)).to.be.false;
      expect(applyAttributes(host, null, true)).to.be.false;
      expect(applyAttributes(host, {}, false)).to.be.false;
      expect(applyAttributes(host, {}, true)).to.be.false;
    });

    it('should apply properties to Element', () => {
      expect(applyAttributes(host, { a: 'b' }, false)).to.be.false;
      expect(host.outerHTML).to.equal('<host a="b"></host>');
      expect(applyAttributes(host, { a: 'b' }, true)).to.be.false;
      expect(host.outerHTML).to.equal('<host a="b"></host>');
      expect(applyAttributes(host, { a: 'c' }, true)).to.be.true;
      expect(host.outerHTML).to.equal('<host a="c"></host>');
    });

    it('should remove properties to Element', () => {
      expect(applyAttributes(host, { a: '' }, false)).to.be.false;
      expect(host.outerHTML).to.equal('<host a=""></host>');
      expect(applyAttributes(host, { a: '' }, true)).to.be.false;
      expect(host.outerHTML).to.equal('<host a=""></host>');
      expect(applyAttributes(host, { a: null! }, true)).to.be.true;
      expect(host.outerHTML).to.equal('<host></host>');
      expect(applyAttributes(host, { a: undefined! }, true)).to.be.true;
      expect(host.outerHTML).to.equal('<host></host>');
    });

    describe('input', () => {
      it('should write both attribute and value in case of input', () => {
        expect(applyAttributes(input, { value: 'hello' }, false)).to.be.false;
        expect(input.value).to.eql('hello');
        expect(input.getAttribute('value')).to.eql('hello');

        expect(applyAttributes(input, { value: 'bar' }, false)).to.be.false;
        expect(input.value).to.eql('bar');
        expect(input.getAttribute('value')).to.eql('bar');

        input.value = 'baz';
        expect(applyAttributes(input, { value: 'hello' }, false)).to.be.false;
        expect(input.value).to.eql('hello');
        expect(input.getAttribute('value')).to.eql('hello');
      });
    });

    describe('innerHTML', () => {
      it('should deal with innerHTML', () => {
        expect(applyAttributes(host, { innerHTML: '<div>text</div>' }, false)).to.be.false;
        expect(host.outerHTML).to.equal('<host inner-h-t-m-l=""><div>text</div></host>');
      });
    });

    describe('$attrs', () => {
      it('should render $attr', async () => {
        const fixture = new ComponentFixture();
        let myValue: string | null = 'someItem:123:child:432';
        fixture.template = () => {
          return <test-component $myData={myValue} />;
        };
        await fixture.render();
        expect(fixture.host.innerHTML).to.equal(
          '<test-component bind:some-item:123:child:432="$myData"></test-component>'
        );
        myValue = 'otherItem';
        await fixture.render();
        expect(fixture.host.innerHTML).to.equal(
          '<test-component bind:other-item="$myData"></test-component>'
        );
        myValue = null;
        await fixture.render();
        expect(fixture.host.innerHTML).to.equal(
          '<test-component bind:="$myData"></test-component>'
        );
      });

      it('should merge bindings', async () => {
        const fixture = new ComponentFixture();
        let value1: string | null = 'someA';
        let value2: string | null = 'someB';
        fixture.template = () => {
          return <test-component $myA={value1} $myB={value2} />;
        };
        await fixture.render();
        expect(fixture.host.innerHTML).to.equal(
          '<test-component bind:some-a="$myA" bind:some-b="$myB"></test-component>'
        );
        value1 = 'same';
        value2 = 'same';
        await fixture.render();
        expect(fixture.host.innerHTML).to.equal(
          '<test-component bind:same="$myA|$myB"></test-component>'
        );
        value1 = null;
        value2 = null;
        await fixture.render();
        expect(fixture.host.innerHTML).to.equal(
          '<test-component bind:="$myA|$myB"></test-component>'
        );
      });
    });
  });

  describe('applyControlProperties', () => {
    it('should apply all on:* properties', () => {
      applyAttributes(
        host,
        {
          'on:click': 'url',
        },
        false
      );
      expect(host.getAttribute('on:click')).to.eql('url');
    });

    it('should apply all service bindings', () => {
      applyAttributes(
        host,
        {
          'decl:services': [
            {
              $attachService: (element: Element) => {
                element.setAttribute('::service', 'url');
              },
            } as any,
          ],
        },
        false
      );
      expect(host.getAttribute('::service')).to.eql('url');
    });

    describe('error', () => {
      it('should error on not an array', () => {
        expect(() =>
          applyAttributes(
            host,
            {
              'decl:services': 'notAnArray',
            },
            false
          )
        ).to.throw(`RENDER-ERROR(Q-603): Expecting array of services, got 'notAnArray'.`);
      });
      it('should error on service does not have $attachService', () => {
        expect(() =>
          applyAttributes(
            host,
            {
              'decl:services': [{ notService: true } as any],
            },
            false
          )
        ).to.throw(`RENDER-ERROR(Q-602): Expecting service object, got '{"notService":true}'.`);
      });
    });
  });

  describe('stringifyClassOrStyle', () => {
    it('should return string', () => {
      expect(stringifyClassOrStyle('value', true)).to.eql('value');
      expect(stringifyClassOrStyle(null!, true)).to.eql('');
    });
    it('should turn into class', () => {
      expect(stringifyClassOrStyle(['a', 'b'], true)).to.eql('a b');
      expect(stringifyClassOrStyle({ a: true, b: false }, true)).to.eql('a');
    });
    it('should turn into style', () => {
      expect(stringifyClassOrStyle({ a: true, b: false }, false)).to.eql('a:true;b:false');
    });
    describe('error', () => {
      it('should complain on setting array on style', () => {
        expect(() => stringifyClassOrStyle(['a', 'b'], false)).to.throw(
          `RENDER-ERROR(Q-601): Value '["a","b"]' can't be written into 'style' attribute.`
        );
      });
    });
  });
  describe('setAttribute', () => {
    let fixture: ElementFixture;
    beforeEach(() => {
      fixture = new ElementFixture({ tagName: 'input' });
    });

    it('should set/remove attribute', () => {
      setAttribute(fixture.host, 'id', 'value');
      expect(fixture.host.getAttribute('id')).to.eql('value');
      setAttribute(fixture.host, 'id', null);
      expect(fixture.host.hasAttribute('id')).to.be.false;
    });

    it('should set class', () => {
      setAttribute(fixture.host, 'class', ['a', 'b']);
      expect(fixture.host.getAttribute('class')).to.eql('a b');
    });

    it('should set style', () => {
      setAttribute(fixture.host, 'style', { color: 'red', width: '10px' });
      expect(fixture.host.getAttribute('style')).to.eql('color:red;width:10px');
    });

    it('should set INPUT properties', () => {
      fixture.host.setAttribute('value', 'initial');
      setAttribute(fixture.host, 'value', 'update');
      expect((fixture.host as HTMLInputElement).value).to.equal('update');
    });

    describe('error', () => {
      it('should complain on setting array on style', () => {
        expect(() => setAttribute(fixture.host, 'style', ['a', 'b'])).to.throw(
          `RENDER-ERROR(Q-601): Value '["a","b"]' can't be written into 'style' attribute.`
        );
      });
    });
  });
});