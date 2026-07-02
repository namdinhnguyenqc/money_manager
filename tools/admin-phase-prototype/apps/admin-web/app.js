const state = {
  page: 1,
  limit: 5,
  keyword: '',
  type: '',
  status: '',
  pendingAction: null,
  view: 'accounts',
  auditPage: 1,
  auditLimit: 10,
  auditModule: '',
  auditAction: '',
  auditRisk: '',
  auditObjectId: '',
}

const els = {
  totalCount: document.querySelector('#totalCount'),
  activeCount: document.querySelector('#activeCount'),
  lockedCount: document.querySelector('#lockedCount'),
  pendingCount: document.querySelector('#pendingCount'),
  filterForm: document.querySelector('#filterForm'),
  keywordInput: document.querySelector('#keywordInput'),
  typeSelect: document.querySelector('#typeSelect'),
  statusSelect: document.querySelector('#statusSelect'),
  resetButton: document.querySelector('#resetButton'),
  refreshButton: document.querySelector('#refreshButton'),
  pageTitle: document.querySelector('#pageTitle'),
  pageDescription: document.querySelector('#pageDescription'),
  viewLinks: document.querySelectorAll('[data-view-link]'),
  accountsView: document.querySelector('#accountsView'),
  auditView: document.querySelector('#auditView'),
  stateMessage: document.querySelector('#stateMessage'),
  accountsBody: document.querySelector('#accountsBody'),
  pageInfo: document.querySelector('#pageInfo'),
  prevPage: document.querySelector('#prevPage'),
  nextPage: document.querySelector('#nextPage'),
  auditList: document.querySelector('#auditList'),
  auditCount: document.querySelector('#auditCount'),
  reasonDialog: document.querySelector('#reasonDialog'),
  dialogTitle: document.querySelector('#dialogTitle'),
  dialogDescription: document.querySelector('#dialogDescription'),
  reasonInput: document.querySelector('#reasonInput'),
  dialogError: document.querySelector('#dialogError'),
  cancelDialog: document.querySelector('#cancelDialog'),
  confirmDialog: document.querySelector('#confirmDialog'),
  auditFilterForm: document.querySelector('#auditFilterForm'),
  auditModuleSelect: document.querySelector('#auditModuleSelect'),
  auditActionSelect: document.querySelector('#auditActionSelect'),
  auditRiskSelect: document.querySelector('#auditRiskSelect'),
  auditObjectInput: document.querySelector('#auditObjectInput'),
  auditResetButton: document.querySelector('#auditResetButton'),
  auditStateMessage: document.querySelector('#auditStateMessage'),
  auditBody: document.querySelector('#auditBody'),
  auditPageInfo: document.querySelector('#auditPageInfo'),
  auditPrevPage: document.querySelector('#auditPrevPage'),
  auditNextPage: document.querySelector('#auditNextPage'),
  auditDetailDialog: document.querySelector('#auditDetailDialog'),
  auditDetailAction: document.querySelector('#auditDetailAction'),
  auditDetailActor: document.querySelector('#auditDetailActor'),
  auditDetailObject: document.querySelector('#auditDetailObject'),
  auditDetailReason: document.querySelector('#auditDetailReason'),
  auditBeforeValue: document.querySelector('#auditBeforeValue'),
  auditAfterValue: document.querySelector('#auditAfterValue'),
  closeAuditDetail: document.querySelector('#closeAuditDetail'),
}

function api(path, options) {
  return fetch(path, {
    headers: {
      'content-type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  }).then(async (response) => {
    const body = await response.json()
    if (!response.ok) {
      throw new Error(body.message || 'Không thể tải dữ liệu')
    }
    return body
  })
}

function setMessage(message, mode = 'info') {
  els.stateMessage.hidden = !message
  els.stateMessage.textContent = message || ''
  els.stateMessage.dataset.mode = mode
}

function setAuditMessage(message, mode = 'info') {
  els.auditStateMessage.hidden = !message
  els.auditStateMessage.textContent = message || ''
  els.auditStateMessage.dataset.mode = mode
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusLabel(status) {
  const labels = {
    active: 'Active',
    locked: 'Locked',
    pending_activation: 'Pending',
    soft_deleted: 'Soft deleted',
  }
  return labels[status] || status
}

function typeLabel(type) {
  const labels = {
    admin: 'Admin',
    owner: 'Owner',
    tenant: 'Tenant',
  }
  return labels[type] || type
}

function accountAction(account) {
  if (account.status === 'locked') {
    return `<button data-action="unlock" data-id="${account.id}" data-name="${account.full_name}">Mở khóa</button>`
  }

  if (account.status === 'active') {
    return `<button class="danger" data-action="lock" data-id="${account.id}" data-name="${account.full_name}">Khóa</button>`
  }

  return '<span class="muted">Không khả dụng</span>'
}

function renderAccounts(payload) {
  els.accountsBody.innerHTML = ''

  if (!payload.data.length) {
    setMessage('Không có tài khoản phù hợp bộ lọc.', 'empty')
  } else {
    setMessage('')
  }

  for (const account of payload.data) {
    const row = document.createElement('tr')
    row.innerHTML = `
      <td class="mono">${account.id}</td>
      <td>
        <div class="account-name">
          <strong>${account.full_name}</strong>
          <span>${account.email}</span>
          <span>${account.phone || '-'}</span>
        </div>
      </td>
      <td>${typeLabel(account.user_type)}</td>
      <td><span class="badge ${account.status}">${statusLabel(account.status)}</span></td>
      <td>${formatDate(account.last_login_at)}</td>
      <td>${formatDate(account.created_at)}</td>
      <td><div class="row-actions">${accountAction(account)}</div></td>
    `
    els.accountsBody.append(row)
  }

  els.pageInfo.textContent = `Trang ${payload.meta.page}/${payload.meta.total_pages} · ${payload.meta.total} tài khoản`
  els.prevPage.disabled = payload.meta.page <= 1
  els.nextPage.disabled = payload.meta.page >= payload.meta.total_pages
}

function renderSummary(summary) {
  els.totalCount.textContent = summary.total
  els.activeCount.textContent = summary.active
  els.lockedCount.textContent = summary.locked
  els.pendingCount.textContent = summary.pending_activation
}

function renderAudit(payload) {
  els.auditList.innerHTML = ''
  els.auditCount.textContent = `${payload.meta.total} log`

  if (!payload.data.length) {
    const item = document.createElement('li')
    item.innerHTML = '<span class="muted">Chưa có audit log trong phiên local này.</span>'
    els.auditList.append(item)
    return
  }

  for (const log of payload.data.slice(0, 5)) {
    const item = document.createElement('li')
    item.innerHTML = `
      <span><strong>${log.action}</strong> · ${log.object_id}<br><span class="muted">${log.reason}</span></span>
      <span class="muted">${formatDate(log.created_at)}</span>
    `
    els.auditList.append(item)
  }
}

function renderAuditTable(payload) {
  els.auditBody.innerHTML = ''

  if (!payload.data.length) {
    setAuditMessage('Không có audit log phù hợp bộ lọc.', 'empty')
  } else {
    setAuditMessage('')
  }

  for (const log of payload.data) {
    const row = document.createElement('tr')
    row.innerHTML = `
      <td>${formatDate(log.created_at)}</td>
      <td>
        <strong>${log.actor_name}</strong><br>
        <span class="muted">${log.actor_role}</span>
      </td>
      <td class="mono">${log.action}</td>
      <td>
        <span>${log.object_type}</span><br>
        <span class="mono">${log.object_id}</span>
      </td>
      <td><span class="badge ${log.risk_level}">${log.risk_level}</span></td>
      <td>${log.reason || '-'}</td>
      <td><button data-audit-detail="${log.id}" type="button">Xem</button></td>
    `
    els.auditBody.append(row)
  }

  els.auditPageInfo.textContent = `Trang ${payload.meta.page}/${payload.meta.total_pages} · ${payload.meta.total} log`
  els.auditPrevPage.disabled = payload.meta.page <= 1
  els.auditNextPage.disabled = payload.meta.page >= payload.meta.total_pages
}

async function loadSummary() {
  const payload = await api('/admin/accounts/summary')
  renderSummary(payload.data)
}

async function loadAccounts() {
  const params = new URLSearchParams({
    page: String(state.page),
    limit: String(state.limit),
  })

  if (state.keyword) params.set('keyword', state.keyword)
  if (state.type) params.set('type', state.type)
  if (state.status) params.set('status', state.status)

  const payload = await api(`/admin/accounts?${params}`)
  renderAccounts(payload)
}

async function loadAudit() {
  const payload = await api('/admin/audit-logs?page=1&limit=5')
  renderAudit(payload)
}

async function loadAuditTable() {
  const params = new URLSearchParams({
    page: String(state.auditPage),
    limit: String(state.auditLimit),
  })

  if (state.auditModule) params.set('module', state.auditModule)
  if (state.auditAction) params.set('action', state.auditAction)
  if (state.auditRisk) params.set('risk_level', state.auditRisk)
  if (state.auditObjectId) {
    params.set('object_type', 'user')
    params.set('object_id', state.auditObjectId)
  }

  const payload = await api(`/admin/audit-logs?${params}`)
  renderAuditTable(payload)
}

async function refresh() {
  try {
    if (state.view === 'accounts') {
      setMessage('Đang tải dữ liệu...')
      await Promise.all([loadSummary(), loadAccounts(), loadAudit()])
      return
    }

    setAuditMessage('Đang tải audit log...')
    await loadAuditTable()
  } catch (error) {
    if (state.view === 'accounts') setMessage(error.message, 'error')
    else setAuditMessage(error.message, 'error')
  }
}

function setView(view) {
  state.view = view
  els.accountsView.hidden = view !== 'accounts'
  els.auditView.hidden = view !== 'audit'

  for (const link of els.viewLinks) {
    link.classList.toggle('active', link.dataset.viewLink === view)
  }

  if (view === 'audit') {
    els.pageTitle.textContent = 'Nhật ký hoạt động'
    els.pageDescription.textContent = 'Phase 2: truy vết hành động quan trọng, chỉ xem, không sửa/xóa.'
  } else {
    els.pageTitle.textContent = 'Quản lý tài khoản'
    els.pageDescription.textContent = 'Phase 1: chuẩn hóa trạng thái, khóa/mở khóa có lý do.'
  }

  refresh()
}

async function openAuditDetail(id) {
  const payload = await api(`/admin/audit-logs/${encodeURIComponent(id)}`)
  const log = payload.data

  els.auditDetailAction.textContent = log.action
  els.auditDetailActor.textContent = `${log.actor_name} · ${log.actor_role}`
  els.auditDetailObject.textContent = `${log.object_type} · ${log.object_id}`
  els.auditDetailReason.textContent = log.reason || '-'
  els.auditBeforeValue.textContent = JSON.stringify(log.before_value, null, 2)
  els.auditAfterValue.textContent = JSON.stringify(log.after_value, null, 2)
  els.auditDetailDialog.showModal()
}

function openReasonDialog(action, account) {
  state.pendingAction = { action, ...account }
  els.reasonInput.value = ''
  els.dialogError.hidden = true
  els.dialogTitle.textContent = action === 'lock' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'
  els.dialogDescription.textContent =
    action === 'lock'
      ? `Tài khoản ${account.name} sẽ không thể đăng nhập cho đến khi được mở khóa.`
      : `Tài khoản ${account.name} sẽ được chuyển về trạng thái active.`
  els.confirmDialog.textContent = action === 'lock' ? 'Khóa tài khoản' : 'Mở khóa'
  els.confirmDialog.classList.toggle('danger', action === 'lock')
  els.reasonDialog.showModal()
}

async function submitReason(event) {
  event.preventDefault()
  const reason = els.reasonInput.value.trim()
  if (!reason) {
    els.dialogError.textContent = 'Bắt buộc nhập lý do.'
    els.dialogError.hidden = false
    return
  }

  const pending = state.pendingAction
  if (!pending) return

  els.confirmDialog.disabled = true
  try {
    await api(`/admin/accounts/${encodeURIComponent(pending.id)}/${pending.action}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
    els.reasonDialog.close()
    await refresh()
  } catch (error) {
    els.dialogError.textContent = error.message
    els.dialogError.hidden = false
  } finally {
    els.confirmDialog.disabled = false
  }
}

els.filterForm.addEventListener('submit', (event) => {
  event.preventDefault()
  state.keyword = els.keywordInput.value.trim()
  state.type = els.typeSelect.value
  state.status = els.statusSelect.value
  state.page = 1
  refresh()
})

els.resetButton.addEventListener('click', () => {
  els.filterForm.reset()
  state.keyword = ''
  state.type = ''
  state.status = ''
  state.page = 1
  refresh()
})

els.refreshButton.addEventListener('click', refresh)

els.viewLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault()
    setView(link.dataset.viewLink)
  })
})

els.prevPage.addEventListener('click', () => {
  state.page = Math.max(state.page - 1, 1)
  refresh()
})

els.nextPage.addEventListener('click', () => {
  state.page += 1
  refresh()
})

els.accountsBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]')
  if (!button) return

  openReasonDialog(button.dataset.action, {
    id: button.dataset.id,
    name: button.dataset.name,
  })
})

els.cancelDialog.addEventListener('click', () => els.reasonDialog.close())
els.reasonDialog.querySelector('form').addEventListener('submit', submitReason)

els.auditFilterForm.addEventListener('submit', (event) => {
  event.preventDefault()
  state.auditModule = els.auditModuleSelect.value
  state.auditAction = els.auditActionSelect.value
  state.auditRisk = els.auditRiskSelect.value
  state.auditObjectId = els.auditObjectInput.value.trim()
  state.auditPage = 1
  refresh()
})

els.auditResetButton.addEventListener('click', () => {
  els.auditFilterForm.reset()
  state.auditModule = ''
  state.auditAction = ''
  state.auditRisk = ''
  state.auditObjectId = ''
  state.auditPage = 1
  refresh()
})

els.auditPrevPage.addEventListener('click', () => {
  state.auditPage = Math.max(state.auditPage - 1, 1)
  refresh()
})

els.auditNextPage.addEventListener('click', () => {
  state.auditPage += 1
  refresh()
})

els.auditBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-audit-detail]')
  if (!button) return
  openAuditDetail(button.dataset.auditDetail)
})

els.closeAuditDetail.addEventListener('click', () => els.auditDetailDialog.close())

refresh()
