import { spawn } from 'node:child_process'

const port = Number(process.env.ADMIN_TEST_PORT ?? 4199)
const baseUrl = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['apps/admin-api/server.mjs'], {
  cwd: new URL('../..', import.meta.url),
  env: {
    ...process.env,
    ADMIN_PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

const failures = []

function fail(message) {
  failures.push(message)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  })
  const body = await response.json()
  return { status: response.status, body }
}

async function waitForServer() {
  const started = Date.now()
  while (Date.now() - started < 10_000) {
    try {
      const response = await fetch(`${baseUrl}/admin/accounts/summary`)
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }

  throw new Error('Admin API did not start in time')
}

async function run() {
  await waitForServer()

  const summary = await request('/admin/accounts/summary')
  assert(summary.status === 200, 'summary should return 200')
  assert(summary.body.data.total === 9, 'summary total should be 9')
  assert(summary.body.data.admin === 3, 'summary admin count should be 3')
  assert(summary.body.data.owner === 3, 'summary owner count should be 3')
  assert(summary.body.data.tenant === 3, 'summary tenant count should be 3')
  assert(summary.body.data.active === 5, 'summary active count should be 5')
  assert(summary.body.data.locked === 2, 'summary locked count should be 2')
  assert(summary.body.data.pending_activation === 2, 'summary pending count should be 2')

  const accounts = await request('/admin/accounts?page=1&limit=20')
  assert(accounts.status === 200, 'account list should return 200')
  assert(accounts.body.meta.total === 9, 'account list total should be 9')

  const locked = await request('/admin/accounts?status=locked')
  assert(locked.status === 200, 'locked filter should return 200')
  assert(locked.body.meta.total === 2, 'locked filter total should be 2')
  assert(
    locked.body.data.every((account) => account.status === 'locked'),
    'locked filter should only include locked accounts'
  )

  const owners = await request('/admin/accounts?type=owner')
  assert(owners.status === 200, 'owner filter should return 200')
  assert(owners.body.meta.total === 3, 'owner filter total should be 3')
  assert(
    owners.body.data.every((account) => account.user_type === 'owner'),
    'owner filter should only include owners'
  )

  const search = await request('/admin/accounts?keyword=owner.active')
  assert(search.status === 200, 'keyword search should return 200')
  assert(search.body.meta.total === 1, 'keyword search should return one account')
  assert(
    search.body.data[0]?.id === 'owner_active_001',
    'keyword search should return owner_active_001'
  )

  const lockWithoutReason = await request('/admin/accounts/owner_active_001/lock', {
    method: 'POST',
    body: JSON.stringify({ reason: '' }),
  })
  assert(lockWithoutReason.status === 400, 'lock without reason should fail')
  assert(
    lockWithoutReason.body.code === 'REASON_REQUIRED',
    'lock without reason should return REASON_REQUIRED'
  )

  const lock = await request('/admin/accounts/owner_active_001/lock', {
    method: 'POST',
    body: JSON.stringify({ reason: 'Kiểm thử khóa tài khoản Phase 1' }),
  })
  assert(lock.status === 200, 'lock with reason should return 200')
  assert(lock.body.data.status === 'locked', 'locked account status should be locked')
  assert(
    lock.body.data.locked_by === 'admin_super_001',
    'locked account should store locked_by'
  )
  assert(
    lock.body.audit_log.action === 'account.lock',
    'lock should create account.lock audit log'
  )
  assert(
    lock.body.audit_log.before_value.status === 'active',
    'lock audit should store before status active'
  )
  assert(
    lock.body.audit_log.after_value.status === 'locked',
    'lock audit should store after status locked'
  )

  const unlockWithoutReason = await request('/admin/accounts/owner_active_001/unlock', {
    method: 'POST',
    body: JSON.stringify({}),
  })
  assert(unlockWithoutReason.status === 400, 'unlock without reason should fail')

  const unlock = await request('/admin/accounts/owner_active_001/unlock', {
    method: 'POST',
    body: JSON.stringify({ reason: 'Kiểm thử mở khóa tài khoản Phase 1' }),
  })
  assert(unlock.status === 200, 'unlock with reason should return 200')
  assert(unlock.body.data.status === 'active', 'unlocked account status should be active')
  assert(unlock.body.data.locked_at === null, 'unlock should clear locked_at')
  assert(unlock.body.data.locked_by === null, 'unlock should clear locked_by')
  assert(unlock.body.audit_log.action === 'account.unlock', 'unlock should create audit log')

  const auditLogs = await request('/admin/audit-logs')
  assert(auditLogs.status === 200, 'audit log list should return 200')
  assert(auditLogs.body.meta.total === 2, 'audit log list should include 2 successful actions')
  assert(
    auditLogs.body.data[0].action === 'account.unlock',
    'latest audit log should be account.unlock'
  )
  assert(
    auditLogs.body.data[1].action === 'account.lock',
    'previous audit log should be account.lock'
  )

  const auditByModule = await request('/admin/audit-logs?module=account')
  assert(auditByModule.status === 200, 'audit module filter should return 200')
  assert(auditByModule.body.meta.total === 2, 'audit module filter should return 2 logs')

  const auditByAction = await request('/admin/audit-logs?action=account.lock')
  assert(auditByAction.status === 200, 'audit action filter should return 200')
  assert(auditByAction.body.meta.total === 1, 'audit action filter should return 1 log')
  assert(
    auditByAction.body.data[0].object_id === 'owner_active_001',
    'audit action filter should return correct object'
  )

  const auditByRisk = await request('/admin/audit-logs?risk_level=high')
  assert(auditByRisk.status === 200, 'audit risk filter should return 200')
  assert(auditByRisk.body.meta.total === 2, 'audit risk filter should return 2 logs')

  const auditByObject = await request('/admin/audit-logs?object_type=user&object_id=owner_active_001')
  assert(auditByObject.status === 200, 'audit object filter should return 200')
  assert(auditByObject.body.meta.total === 2, 'audit object filter should return 2 logs')

  const auditDetailId = auditLogs.body.data[0].id
  const auditDetail = await request(`/admin/audit-logs/${encodeURIComponent(auditDetailId)}`)
  assert(auditDetail.status === 200, 'audit detail should return 200')
  assert(auditDetail.body.data.id === auditDetailId, 'audit detail should return requested log')
  assert(
    auditDetail.body.data.before_value.status === 'locked',
    'audit detail should include before_value'
  )
  assert(
    auditDetail.body.data.after_value.status === 'active',
    'audit detail should include after_value'
  )

  const missingAuditDetail = await request('/admin/audit-logs/not-found')
  assert(missingAuditDetail.status === 404, 'missing audit detail should return 404')

  const permissions = await request('/admin/me/permissions')
  assert(permissions.status === 200, 'me permissions should return 200')
  assert(
    permissions.body.data.permissions.includes('role.update'),
    'Super Admin should have role.update'
  )

  const readonlyPermissions = await request('/admin/me/permissions', {
    headers: {
      'x-admin-role': 'Read-only Admin',
    },
  })
  assert(readonlyPermissions.status === 200, 'read-only permissions should return 200')
  assert(
    !readonlyPermissions.body.data.permissions.includes('account.lock'),
    'Read-only Admin should not have account.lock'
  )

  const readonlyLock = await request('/admin/accounts/tenant_active_001/lock', {
    method: 'POST',
    headers: {
      'x-admin-role': 'Read-only Admin',
    },
    body: JSON.stringify({ reason: 'Read-only không được khóa' }),
  })
  assert(readonlyLock.status === 403, 'read-only lock should return 403')
  assert(
    readonlyLock.body.required_permission === 'account.lock',
    'read-only lock should require account.lock'
  )

  const roles = await request('/admin/roles')
  assert(roles.status === 200, 'role list should return 200')
  assert(roles.body.data.length === 3, 'role list should include 3 roles')

  const roleDetail = await request('/admin/roles/role_operation_admin')
  assert(roleDetail.status === 200, 'role detail should return 200')
  assert(
    roleDetail.body.data.permissions.includes('account.lock'),
    'Operation Admin should initially have account.lock'
  )

  const roleUpdateWithoutReason = await request('/admin/roles/role_operation_admin/permissions', {
    method: 'PATCH',
    body: JSON.stringify({
      permissions: ['account.view'],
      reason: '',
    }),
  })
  assert(roleUpdateWithoutReason.status === 400, 'role update without reason should fail')
  assert(
    roleUpdateWithoutReason.body.code === 'REASON_REQUIRED',
    'role update without reason should return REASON_REQUIRED'
  )

  const readonlyRoleUpdate = await request('/admin/roles/role_operation_admin/permissions', {
    method: 'PATCH',
    headers: {
      'x-admin-role': 'Read-only Admin',
    },
    body: JSON.stringify({
      permissions: ['account.view'],
      reason: 'Read-only không được sửa role',
    }),
  })
  assert(readonlyRoleUpdate.status === 403, 'read-only role update should return 403')
  assert(
    readonlyRoleUpdate.body.required_permission === 'role.update',
    'read-only role update should require role.update'
  )

  const roleUpdate = await request('/admin/roles/role_operation_admin/permissions', {
    method: 'PATCH',
    body: JSON.stringify({
      permissions: ['account.view', 'audit_log.view', 'owner.view'],
      reason: 'Kiểm thử cập nhật permission Phase 3',
    }),
  })
  assert(roleUpdate.status === 200, 'role update should return 200')
  assert(
    roleUpdate.body.data.permissions.length === 3,
    'role update should store new permission list'
  )
  assert(
    roleUpdate.body.audit_log.action === 'role.update',
    'role update should create role.update audit log'
  )
  assert(
    roleUpdate.body.audit_log.risk_level === 'critical',
    'role update audit log should be critical'
  )

  const roleAuditLogs = await request('/admin/audit-logs?module=role&action=role.update')
  assert(roleAuditLogs.status === 200, 'role audit filter should return 200')
  assert(roleAuditLogs.body.meta.total === 1, 'role audit filter should return 1 log')

  const adminUsers = await request('/admin/admin-users')
  assert(adminUsers.status === 200, 'admin users should return 200')
  assert(adminUsers.body.meta.total === 3, 'admin users should include 3 admins')
}

try {
  await run()
} finally {
  server.kill()
}

if (failures.length) {
  console.error('Admin API tests failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Admin API tests passed.')
