import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = normalize(join(__dirname, '..', '..'))
const webDir = join(rootDir, 'apps', 'admin-web')
const seedPath = join(__dirname, 'data', 'seed.json')

const port = Number(process.env.ADMIN_PORT ?? 4100)
const state = JSON.parse(await readFile(seedPath, 'utf8'))

const statusValues = new Set([
  'pending_activation',
  'active',
  'locked',
  'soft_deleted',
])

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(payload, null, 2))
}

function getActor(req) {
  const roleName = req.headers['x-admin-role'] || state.currentAdmin.role_name
  const user = state.users.find(
    (candidate) => candidate.user_type === 'admin' && candidate.role_name === roleName
  )

  return {
    id: user?.id ?? state.currentAdmin.id,
    full_name: user?.full_name ?? state.currentAdmin.full_name,
    email: user?.email ?? state.currentAdmin.email,
    role_name: String(roleName),
  }
}

function getRoleByName(roleName) {
  return state.roles.find((role) => role.name === roleName)
}

function getPermissionsForRole(roleName) {
  return getRoleByName(roleName)?.permissions ?? []
}

function hasPermission(req, permission) {
  return getPermissionsForRole(getActor(req).role_name).includes(permission)
}

function requirePermission(req, res, permission) {
  if (hasPermission(req, permission)) return true

  json(res, 403, {
    message: 'Không có quyền thực hiện thao tác này.',
    code: 'FORBIDDEN',
    required_permission: permission,
  })
  return false
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
  })
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function paginate(items, page, limit) {
  const safePage = Math.max(Number(page) || 1, 1)
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100)
  const start = (safePage - 1) * safeLimit

  return {
    data: items.slice(start, start + safeLimit),
    meta: {
      page: safePage,
      limit: safeLimit,
      total: items.length,
      total_pages: Math.max(Math.ceil(items.length / safeLimit), 1),
    },
  }
}

function publicUser(user) {
  return {
    id: user.id,
    user_type: user.user_type,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    role_name: user.role_name,
    last_login_at: user.last_login_at,
    locked_at: user.locked_at,
    locked_by: user.locked_by,
    locked_reason: user.locked_reason,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}

function createAuditLog({
  req,
  module = 'account',
  action,
  objectType = 'user',
  objectId,
  beforeValue,
  afterValue,
  reason,
  riskLevel = 'high',
}) {
  const now = new Date().toISOString()
  const actor = getActor(req)
  const log = {
    id: `audit_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    actor_id: actor.id,
    actor_name: actor.full_name,
    actor_role: actor.role_name,
    module,
    action,
    object_type: objectType,
    object_id: objectId,
    before_value: beforeValue,
    after_value: afterValue,
    reason,
    risk_level: riskLevel,
    ip_address: req.socket.remoteAddress,
    user_agent: req.headers['user-agent'] ?? '',
    created_at: now,
  }

  state.auditLogs.unshift(log)
  return log
}

function getAccounts(url) {
  const keyword = normalizeText(url.searchParams.get('keyword'))
  const type = normalizeText(url.searchParams.get('type'))
  const status = normalizeText(url.searchParams.get('status'))
  const sortBy = url.searchParams.get('sort_by') || 'created_at'
  const sortOrder = url.searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc'

  let users = state.users.filter((user) => !user.deleted_at)

  if (keyword) {
    users = users.filter((user) => {
      return [user.full_name, user.email, user.phone, user.id]
        .map(normalizeText)
        .some((value) => value.includes(keyword))
    })
  }

  if (type) {
    users = users.filter((user) => user.user_type === type)
  }

  if (status) {
    users = users.filter((user) => user.status === status)
  }

  users.sort((left, right) => {
    const leftValue = left[sortBy] ?? ''
    const rightValue = right[sortBy] ?? ''
    return sortOrder === 'asc'
      ? String(leftValue).localeCompare(String(rightValue))
      : String(rightValue).localeCompare(String(leftValue))
  })

  return paginate(users.map(publicUser), url.searchParams.get('page'), url.searchParams.get('limit'))
}

function getSummary() {
  const summary = {
    total: state.users.length,
    admin: 0,
    owner: 0,
    tenant: 0,
    pending_activation: 0,
    active: 0,
    locked: 0,
    soft_deleted: 0,
  }

  for (const user of state.users) {
    summary[user.user_type] += 1
    summary[user.status] += 1
  }

  return summary
}

function publicRole(role) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    is_system: role.is_system,
    permissions: [...role.permissions],
  }
}

function getAdminUsers() {
  return state.users
    .filter((user) => user.user_type === 'admin')
    .map(publicUser)
}

function updateRolePermissions({ req, roleId, permissions, reason }) {
  if (!reason || !String(reason).trim()) {
    return {
      statusCode: 400,
      payload: {
        message: 'Bắt buộc nhập lý do.',
        code: 'REASON_REQUIRED',
      },
    }
  }

  if (!Array.isArray(permissions)) {
    return {
      statusCode: 400,
      payload: {
        message: 'Danh sách permission không hợp lệ.',
        code: 'INVALID_PERMISSIONS',
      },
    }
  }

  const role = state.roles.find((candidate) => candidate.id === roleId)
  if (!role) {
    return {
      statusCode: 404,
      payload: {
        message: 'Không tìm thấy role.',
        code: 'ROLE_NOT_FOUND',
      },
    }
  }

  const invalidPermissions = permissions.filter((permission) => {
    return !state.permissions.includes(permission)
  })

  if (invalidPermissions.length) {
    return {
      statusCode: 400,
      payload: {
        message: 'Permission không tồn tại.',
        code: 'INVALID_PERMISSION_KEY',
        invalid_permissions: invalidPermissions,
      },
    }
  }

  if (role.name === 'Super Admin' && !permissions.includes('role.update')) {
    return {
      statusCode: 400,
      payload: {
        message: 'Không được làm mất quyền cập nhật role của Super Admin.',
        code: 'LAST_SUPER_ADMIN_PROTECTION',
      },
    }
  }

  const beforeValue = {
    permissions: [...role.permissions],
  }
  role.permissions = [...new Set(permissions)]
  const afterValue = {
    permissions: [...role.permissions],
  }

  const log = createAuditLog({
    req,
    module: 'role',
    action: 'role.update',
    objectType: 'role',
    objectId: role.id,
    beforeValue,
    afterValue,
    reason: reason.trim(),
    riskLevel: 'critical',
  })

  return {
    statusCode: 200,
    payload: {
      data: publicRole(role),
      audit_log: log,
    },
  }
}

function getAuditLogs(url) {
  const filters = {
    actor_id: url.searchParams.get('actor_id'),
    module: url.searchParams.get('module'),
    action: url.searchParams.get('action'),
    risk_level: url.searchParams.get('risk_level'),
    object_type: url.searchParams.get('object_type'),
    object_id: url.searchParams.get('object_id'),
    created_from: url.searchParams.get('created_from'),
    created_to: url.searchParams.get('created_to'),
  }

  let logs = [...state.auditLogs]

  for (const key of ['actor_id', 'module', 'action', 'risk_level', 'object_type', 'object_id']) {
    if (filters[key]) {
      logs = logs.filter((log) => log[key] === filters[key])
    }
  }

  if (filters.created_from) {
    const createdFrom = new Date(filters.created_from).getTime()
    logs = logs.filter((log) => new Date(log.created_at).getTime() >= createdFrom)
  }

  if (filters.created_to) {
    const createdTo = new Date(filters.created_to).getTime()
    logs = logs.filter((log) => new Date(log.created_at).getTime() <= createdTo)
  }

  return paginate(logs, url.searchParams.get('page'), url.searchParams.get('limit'))
}

function updateAccountStatus({ req, id, nextStatus, reason }) {
  if (!reason || !String(reason).trim()) {
    return {
      statusCode: 400,
      payload: {
        message: 'Bắt buộc nhập lý do.',
        code: 'REASON_REQUIRED',
      },
    }
  }

  if (!statusValues.has(nextStatus)) {
    return {
      statusCode: 400,
      payload: {
        message: 'Trạng thái không hợp lệ.',
        code: 'INVALID_STATUS',
      },
    }
  }

  const user = state.users.find((candidate) => candidate.id === id)
  if (!user) {
    return {
      statusCode: 404,
      payload: {
        message: 'Không tìm thấy tài khoản.',
        code: 'ACCOUNT_NOT_FOUND',
      },
    }
  }

  const beforeValue = {
    status: user.status,
    locked_at: user.locked_at,
    locked_by: user.locked_by,
    locked_reason: user.locked_reason,
  }
  const now = new Date().toISOString()

  user.status = nextStatus
  user.updated_at = now

  if (nextStatus === 'locked') {
    user.locked_at = now
    user.locked_by = state.currentAdmin.id
    user.locked_reason = reason.trim()
  }

  if (nextStatus === 'active') {
    user.locked_at = null
    user.locked_by = null
    user.locked_reason = null
  }

  const afterValue = {
    status: user.status,
    locked_at: user.locked_at,
    locked_by: user.locked_by,
    locked_reason: user.locked_reason,
  }

  const log = createAuditLog({
    req,
    action: nextStatus === 'locked' ? 'account.lock' : 'account.unlock',
    objectId: user.id,
    beforeValue,
    afterValue,
    reason: reason.trim(),
  })

  return {
    statusCode: 200,
    payload: {
      data: publicUser(user),
      audit_log: log,
    },
  }
}

async function serveStatic(req, res, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1)
  const normalizedPath = normalize(relativePath).replace(/^(\.\.[/\\])+/, '')
  const filePath = join(webDir, normalizedPath)

  try {
    const body = await readFile(filePath)
    const contentType = contentTypes[extname(filePath)] ?? 'application/octet-stream'
    res.writeHead(200, { 'content-type': contentType })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const pathname = url.pathname

  try {
    if (req.method === 'GET' && pathname === '/admin/accounts') {
      if (!requirePermission(req, res, 'account.view')) return
      json(res, 200, getAccounts(url))
      return
    }

    if (req.method === 'GET' && pathname === '/admin/accounts/summary') {
      if (!requirePermission(req, res, 'account.view')) return
      json(res, 200, { data: getSummary() })
      return
    }

    if (req.method === 'GET' && pathname === '/admin/me/permissions') {
      const actor = getActor(req)
      json(res, 200, {
        data: {
          actor,
          permissions: getPermissionsForRole(actor.role_name),
        },
      })
      return
    }

    if (req.method === 'GET' && pathname === '/admin/audit-logs') {
      if (!requirePermission(req, res, 'audit_log.view')) return
      json(res, 200, getAuditLogs(url))
      return
    }

    const auditDetailMatch = pathname.match(/^\/admin\/audit-logs\/([^/]+)$/)
    if (req.method === 'GET' && auditDetailMatch) {
      if (!requirePermission(req, res, 'audit_log.view')) return
      const id = decodeURIComponent(auditDetailMatch[1])
      const log = state.auditLogs.find((candidate) => candidate.id === id)

      if (!log) {
        json(res, 404, {
          message: 'Không tìm thấy audit log.',
          code: 'AUDIT_LOG_NOT_FOUND',
        })
        return
      }

      json(res, 200, { data: log })
      return
    }

    const statusMatch = pathname.match(/^\/admin\/accounts\/([^/]+)\/(lock|unlock)$/)
    if (req.method === 'POST' && statusMatch) {
      const requiredPermission = statusMatch[2] === 'lock' ? 'account.lock' : 'account.unlock'
      if (!requirePermission(req, res, requiredPermission)) return
      const body = await parseBody(req)
      const result = updateAccountStatus({
        req,
        id: decodeURIComponent(statusMatch[1]),
        nextStatus: statusMatch[2] === 'lock' ? 'locked' : 'active',
        reason: body.reason,
      })
      json(res, result.statusCode, result.payload)
      return
    }

    if (req.method === 'GET' && pathname === '/admin/admin-users') {
      if (!requirePermission(req, res, 'admin_user.view')) return
      json(res, 200, paginate(getAdminUsers(), url.searchParams.get('page'), url.searchParams.get('limit')))
      return
    }

    if (req.method === 'GET' && pathname === '/admin/roles') {
      if (!requirePermission(req, res, 'role.view')) return
      json(res, 200, {
        data: state.roles.map(publicRole),
      })
      return
    }

    const roleDetailMatch = pathname.match(/^\/admin\/roles\/([^/]+)$/)
    if (req.method === 'GET' && roleDetailMatch) {
      if (!requirePermission(req, res, 'role.view')) return
      const role = state.roles.find((candidate) => candidate.id === decodeURIComponent(roleDetailMatch[1]))
      if (!role) {
        json(res, 404, {
          message: 'Không tìm thấy role.',
          code: 'ROLE_NOT_FOUND',
        })
        return
      }
      json(res, 200, { data: publicRole(role) })
      return
    }

    const rolePermissionMatch = pathname.match(/^\/admin\/roles\/([^/]+)\/permissions$/)
    if (req.method === 'PATCH' && rolePermissionMatch) {
      if (!requirePermission(req, res, 'role.update')) return
      const body = await parseBody(req)
      const result = updateRolePermissions({
        req,
        roleId: decodeURIComponent(rolePermissionMatch[1]),
        permissions: body.permissions,
        reason: body.reason,
      })
      json(res, result.statusCode, result.payload)
      return
    }

    if (pathname.startsWith('/admin/')) {
      json(res, 404, {
        message: 'API chưa được triển khai trong phase hiện tại.',
        code: 'ADMIN_API_NOT_FOUND',
      })
      return
    }

    await serveStatic(req, res, pathname)
  } catch (error) {
    json(res, 500, {
      message: error instanceof Error ? error.message : 'Unexpected server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

server.listen(port, () => {
  console.log(`TroCare Admin local server: http://localhost:${port}`)
})
