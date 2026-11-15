// Tests de la lectura de la vuelta de Google (src/lib/oauth.ts).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { leerRespuestaOAuth } from '../src/lib/oauth.ts';

test('tokens en el fragmento (flujo implícito)', () => {
  const r = leerRespuestaOAuth('aguante://auth#access_token=abc.def&expires_in=3600&refresh_token=xyz&token_type=bearer');
  assert.equal(r.access_token, 'abc.def');
  assert.equal(r.refresh_token, 'xyz');
  assert.equal(r.code, undefined);
  assert.equal(r.error, undefined);
});

test('código en la consulta (flujo PKCE)', () => {
  assert.equal(leerRespuestaOAuth('aguante://auth?code=34e770dd-9ff9').code, '34e770dd-9ff9');
});

test('error con descripción codificada', () => {
  const r = leerRespuestaOAuth('aguante://auth?error=access_denied&error_description=Unsupported+provider%3A+not+enabled');
  assert.equal(r.error, 'Unsupported provider: not enabled');
});

test('sin nada y con un parámetro mal codificado', () => {
  assert.ok(Object.values(leerRespuestaOAuth('aguante://auth')).every((v) => v === undefined));
  assert.equal(leerRespuestaOAuth('aguante://auth#access_token=%E0%A4%A&refresh_token=r').refresh_token, 'r');
});
