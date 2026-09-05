/**
 * Minimal XML-RPC client that runs entirely in the browser renderer process.
 *
 * Supports the subset of XML-RPC types used by the Odoo /xmlrpc/2/* endpoints:
 * string, int, i4, i8, boolean, double, array, struct, nil, base64.
 */

// ─── Serialisation ──────────────────────────────────────────────────────────

function escXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function serializeValue(value) {
  if (value === null || value === undefined) {
    return '<value><nil/></value>';
  }
  if (typeof value === 'boolean') {
    return `<value><boolean>${value ? 1 : 0}</boolean></value>`;
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return `<value><int>${value}</int></value>`;
    }
    return `<value><double>${value}</double></value>`;
  }
  if (typeof value === 'string') {
    return `<value><string>${escXml(value)}</string></value>`;
  }
  if (Array.isArray(value)) {
    const items = value.map(serializeValue).join('');
    return `<value><array><data>${items}</data></array></value>`;
  }
  if (typeof value === 'object') {
    const members = Object.entries(value)
      .map(([k, v]) => `<member><name>${escXml(k)}</name>${serializeValue(v)}</member>`)
      .join('');
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${escXml(String(value))}</string></value>`;
}

export function buildXmlRpcRequest(method, params) {
  const paramXml = params.map((p) => `<param>${serializeValue(p)}</param>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<methodCall><methodName>${escXml(method)}</methodName><params>${paramXml}</params></methodCall>`;
}

// ─── Deserialisation ─────────────────────────────────────────────────────────

function parseValue(node) {
  if (!node) return null;

  // <value> element — get the typed child
  const typed = node.firstElementChild;
  if (!typed) {
    // bare text inside <value> means string
    return node.textContent;
  }

  const tag = typed.tagName.toLowerCase();

  switch (tag) {
    case 'string':  return typed.textContent;
    case 'int':
    case 'i4':
    case 'i8':      return parseInt(typed.textContent, 10);
    case 'double':  return parseFloat(typed.textContent);
    case 'boolean': return typed.textContent.trim() === '1';
    case 'nil':     return null;
    case 'base64':  return typed.textContent.trim();

    case 'array': {
      const dataNode = typed.querySelector('data');
      if (!dataNode) return [];
      return Array.from(dataNode.children).map(parseValue);
    }

    case 'struct': {
      const result = {};
      for (const member of typed.querySelectorAll(':scope > member')) {
        const name  = member.querySelector(':scope > name')?.textContent ?? '';
        const val   = member.querySelector(':scope > value');
        result[name] = parseValue(val);
      }
      return result;
    }

    default:
      return typed.textContent;
  }
}

export function parseXmlRpcResponse(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML-RPC parse error: ${parseError.textContent}`);
  }

  const fault = doc.querySelector('methodResponse > fault');
  if (fault) {
    const faultValue = parseValue(fault.querySelector('value'));
    const code   = faultValue?.faultCode   ?? 0;
    const string = faultValue?.faultString ?? 'Unknown XML-RPC fault';
    const err = new Error(`XML-RPC fault [${code}]: ${string}`);
    err.faultCode = code;
    err.faultString = string;
    throw err;
  }

  const paramValue = doc.querySelector('methodResponse > params > param > value');
  if (!paramValue) {
    throw new Error('XML-RPC response missing <params><param><value>');
  }
  return parseValue(paramValue);
}

// ─── High-level call helper ──────────────────────────────────────────────────

export async function xmlrpcCall(host, path, method, params) {
  const url = host.replace(/\/$/, '') + path;
  const body = buildXmlRpcRequest(method, params);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
      body,
    });
  } catch (err) {
    throw new Error(`XML-RPC network error: ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(`XML-RPC HTTP ${response.status}: ${response.statusText}`);
  }

  const text = await response.text();
  return parseXmlRpcResponse(text);
}
