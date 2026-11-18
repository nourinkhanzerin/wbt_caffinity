// Delivery Rider features: assigned orders, delivery status, cash confirmation and history.

if (loggedInUser && loggedInUser.role === 'rider') {
    function localDateKey(dateText) {
        var date = new Date(dateText);
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }

    function renderAssignedDeliveries() {
        var data = getCafeData();
        var orders = data.orders.filter(function (order) {
            return order.riderId === loggedInUser.id && order.status !== 'Delivered';
        });
        var wrapper = document.getElementById('assigned-deliveries');
        var html = '';
        orders.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
        for (var i = 0; i < orders.length; i++) {
            var order = orders[i];
            var itemsText = order.items.map(function (item) { return item.name + ' x ' + item.quantity; }).join(', ');
            html += '<div class="list-card"><div class="list-card-top"><div><h4>' + escapeHtml(order.id) + '</h4><p>' + formatDateTime(order.createdAt) + '</p></div><span class="status-pill ' + statusClass(order.status) + '">' + escapeHtml(order.status) + '</span></div>' +
                '<p><b>Customer:</b> ' + escapeHtml(order.customerName) + '</p><p><b>Contact:</b> ' + escapeHtml(order.phone) + '</p><p><b>Address:</b> ' + escapeHtml(order.address) + '</p><p><b>Order:</b> ' + escapeHtml(itemsText) + '</p><p><b>Payment:</b> ' + escapeHtml(order.paymentMethod) + ' · <b>Total:</b> ' + formatMoney(order.total) + '</p>' +
                (order.paymentMethod === 'Cash on Delivery' && !order.cashCollected && order.status === 'Out for Delivery' ? '<div class="order-actions"><button class="button button-small button-light" data-confirm-cash="' + escapeHtml(order.id) + '">Confirm Cash Collected</button><span class="small-note">Confirm after receiving ' + formatMoney(order.total) + '.</span></div>' : '') +
                getDeliveryAction(order) + '</div>';
        }
        wrapper.innerHTML = html || '<div class="panel empty-state">No active deliveries assigned to you. The owner can assign ready orders.</div>';

        wrapper.querySelectorAll('[data-confirm-cash]').forEach(function (button) {
            button.addEventListener('click', function () {
                updateRiderOrder(this.getAttribute('data-confirm-cash'), 'cash');
            });
        });
        wrapper.querySelectorAll('[data-delivery-status]').forEach(function (button) {
            button.addEventListener('click', function () {
                updateRiderOrder(this.getAttribute('data-delivery-status'), this.getAttribute('data-next'));
            });
        });
    }

    function getDeliveryAction(order) {
        if (order.status === 'Ready') {
            return '<div class="order-actions"><button class="button button-small" data-delivery-status="' + escapeHtml(order.id) + '" data-next="Picked Up">Mark Picked Up</button></div>';
        }
        if (order.status === 'Picked Up') {
            return '<div class="order-actions"><button class="button button-small" data-delivery-status="' + escapeHtml(order.id) + '" data-next="Out for Delivery">Out for Delivery</button></div>';
        }
        if (order.status === 'Out for Delivery') {
            if (order.paymentMethod === 'Cash on Delivery' && !order.cashCollected) {
                return '<p class="small-note">Confirm cash collection before marking this order as delivered.</p>';
            }
            return '<div class="order-actions"><button class="button button-small" data-delivery-status="' + escapeHtml(order.id) + '" data-next="Delivered">Mark Delivered</button></div>';
        }
        return '';
    }

    function updateRiderOrder(orderId, action) {
        var data = getCafeData();
        var order = data.orders.find(function (entry) { return entry.id === orderId && entry.riderId === loggedInUser.id; });
        if (!order) return;
        if (action === 'cash') {
            order.cashCollected = true;
        } else {
            if (action === 'Delivered' && order.paymentMethod === 'Cash on Delivery' && !order.cashCollected) {
                window.alert('Please confirm cash collection first.');
                return;
            }
            order.status = action;
            if (action === 'Delivered') order.deliveredAt = new Date().toISOString();
        }
        saveCafeData(data);
        renderAssignedDeliveries();
        renderRiderHistory();
    }

    function renderRiderHistory() {
        var data = getCafeData();
        var completed = data.orders.filter(function (order) { return order.riderId === loggedInUser.id && order.status === 'Delivered'; });
        var todayOrders = completed.filter(function (order) { return localDateKey(order.deliveredAt || order.createdAt) === getTodayString(); });
        var cashTotal = todayOrders.filter(function (order) { return order.cashCollected; }).reduce(function (total, order) { return total + Number(order.total); }, 0);
        document.getElementById('rider-summary').innerHTML =
            '<div class="stat-card"><span>Completed deliveries today</span><strong>' + todayOrders.length + '</strong></div>' +
            '<div class="stat-card"><span>Total completed deliveries</span><strong>' + completed.length + '</strong></div>' +
            '<div class="stat-card"><span>Cash collected today</span><strong>' + formatMoney(cashTotal) + '</strong></div>';
        var wrapper = document.getElementById('rider-history');
        var html = '';
        completed.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        for (var i = 0; i < completed.length; i++) {
            var order = completed[i];
            html += '<div class="list-card"><div class="list-card-top"><h4>' + escapeHtml(order.id) + '</h4><span class="status-pill status-delivered">Delivered</span></div><p>Customer: ' + escapeHtml(order.customerName) + ' · ' + formatDateTime(order.deliveredAt || order.createdAt) + '</p><p>Address: ' + escapeHtml(order.address) + '</p><p>Total: ' + formatMoney(order.total) + ' · Cash collected: ' + (order.paymentMethod !== 'Cash on Delivery' ? 'Not required' : (order.cashCollected ? 'Yes' : 'No')) + '</p></div>'; 
        }
        wrapper.innerHTML = html || '<div class="empty-state">Your completed deliveries will appear here.</div>';
    }

    document.getElementById('refresh-rider').addEventListener('click', function () {
        renderAssignedDeliveries();
        renderRiderHistory();
    });
    renderAssignedDeliveries();
    renderRiderHistory();

    window.addEventListener('storage', function (event) {
        if (event.key === CAFE_DATA_KEY) {
            renderAssignedDeliveries();
            renderRiderHistory();
        }
    });
}
