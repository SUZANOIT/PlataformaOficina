"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteHistoryHelper = void 0;
exports.QuoteHistoryHelper = {
    createEvent(params, action, description, details) {
        return {
            quoteId: params.quoteId,
            companyId: params.companyId,
            userId: params.userId || null,
            userName: params.userName,
            action,
            description,
            details: details ? JSON.stringify(details) : null,
        };
    },
    generateDiff(oldQuote, newQuote, params) {
        const events = [];
        // Status changed
        if (newQuote.status && oldQuote.status !== newQuote.status) {
            events.push(this.createEvent(params, 'STATUS_ALTERADO', 'STATUS ALTERADO', {
                de: oldQuote.status,
                para: newQuote.status
            }));
        }
        // Observacao changed
        if (newQuote.observacao !== undefined && oldQuote.observacao !== newQuote.observacao) {
            events.push(this.createEvent(params, 'OBSERVACAO_ALTERADA', 'OBSERVAÇÃO ALTERADA', {
                de: oldQuote.observacao || '',
                para: newQuote.observacao || ''
            }));
        }
        // Items changed
        const oldItems = oldQuote.items || [];
        const newItems = newQuote.items || [];
        // Find added items
        const addedItems = newItems.filter(newItem => !oldItems.some(oldItem => oldItem.descricao === newItem.descricao));
        addedItems.forEach(item => {
            const isPeca = item.tipo === 'Peça' || item.tipo === 'Produto';
            events.push(this.createEvent(params, isPeca ? 'PECA_ADICIONADA' : 'SERVICO_ADICIONADO', isPeca ? 'PEÇA ADICIONADA' : 'SERVIÇO ADICIONADO', {
                descricao: item.descricao,
                quantidade: item.quantidade,
                valorUnitario: item.valorUnitario,
                codigo: item.codigoPeca || undefined
            }));
        });
        // Find removed items
        const removedItems = oldItems.filter(oldItem => !newItems.some(newItem => newItem.descricao === oldItem.descricao));
        removedItems.forEach(item => {
            const isPeca = item.tipo === 'Peça' || item.tipo === 'Produto';
            events.push(this.createEvent(params, isPeca ? 'PECA_REMOVIDA' : 'SERVICO_REMOVIDO', isPeca ? 'PEÇA REMOVIDA' : 'SERVIÇO REMOVIDO', {
                descricao: item.descricao,
                quantidade: item.quantidade,
                valorUnitario: item.valorUnitario,
                codigo: item.codigoPeca || undefined
            }));
        });
        // Find modified items
        const modifiedItems = newItems.filter(newItem => oldItems.some(oldItem => oldItem.descricao === newItem.descricao));
        modifiedItems.forEach(newItem => {
            const oldItem = oldItems.find(i => i.descricao === newItem.descricao);
            let modified = false;
            const changes = { descricao: newItem.descricao };
            if (oldItem.quantidade !== newItem.quantidade) {
                changes.quantidadeDe = oldItem.quantidade;
                changes.quantidadePara = newItem.quantidade;
                modified = true;
            }
            if (oldItem.valorUnitario !== newItem.valorUnitario) {
                changes.valorDe = oldItem.valorUnitario;
                changes.valorPara = newItem.valorUnitario;
                modified = true;
            }
            if (oldItem.descricao !== newItem.descricao) {
                changes.descricaoDe = oldItem.descricao;
                changes.descricaoPara = newItem.descricao;
                modified = true;
            }
            if (modified) {
                const isPeca = newItem.tipo === 'Peça' || newItem.tipo === 'Produto';
                events.push(this.createEvent(params, isPeca ? 'PECA_MODIFICADA' : 'SERVICO_MODIFICADO', isPeca ? 'PEÇA MODIFICADA' : 'SERVIÇO MODIFICADO', changes));
            }
        });
        // If no specific event was tracked but something changed
        if (events.length === 0) {
            if (oldQuote.total !== newQuote.total || oldQuote.subtotal !== newQuote.subtotal) {
                events.push(this.createEvent(params, 'VALOR_ALTERADO', 'VALORES ALTERADOS', {
                    de: oldQuote.total,
                    para: newQuote.total
                }));
            }
            else {
                // Generic edit
                events.push(this.createEvent(params, 'EDITADO', 'ORÇAMENTO EDITADO', {}));
            }
        }
        return events;
    }
};
