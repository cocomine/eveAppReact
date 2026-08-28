import Decimal from 'decimal.js';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { buildExchangeRateGroups, ExchangeRateCard, ExchangeRecordRow } from '../module/Exchange';

const createRow = (overrides: Partial<ExchangeRecordRow> = {}): ExchangeRecordRow => ({
    RecordID: 1,
    DateTime: '2026-08-01',
    Local: '深圳倉',
    RMB: 0,
    HKD: 0,
    Add: 0,
    Shipping: 0,
    Rate: 0.836,
    ...overrides,
});

describe('buildExchangeRateGroups', () => {
    test('uses the configured rate for legacy null-rate records', () => {
        const groups = buildExchangeRateGroups(
            [createRow({ RecordID: 1, Rate: null }), createRow({ RecordID: 2, Rate: 0.836 })],
            '0.836',
        );

        expect(groups).toHaveLength(1);
        expect(groups[0].rate.equals(new Decimal('0.836'))).toBe(true);
        expect(groups[0].records).toHaveLength(2);
    });

    test('selects the newest rate when usage counts are tied', () => {
        const groups = buildExchangeRateGroups(
            [
                createRow({ RecordID: 1, DateTime: '2026-08-04', Rate: 0.81 }),
                createRow({ RecordID: 2, DateTime: '2026-08-10', Rate: 0.81 }),
                createRow({ RecordID: 3, DateTime: '2026-08-08', Rate: 0.82 }),
                createRow({ RecordID: 4, DateTime: '2026-08-15', Rate: 0.82 }),
            ],
            '0.836',
        );

        expect(groups.map(group => group.rate.toString())).toEqual(['0.82', '0.81']);
    });

    test('orders records newest first inside each rate card', () => {
        const groups = buildExchangeRateGroups(
            [
                createRow({ RecordID: 1, DateTime: '2026-08-01' }),
                createRow({ RecordID: 2, DateTime: '2026-08-20' }),
                createRow({ RecordID: 3, DateTime: '2026-08-10' }),
            ],
            '0.836',
        );

        expect(groups[0].records.map(record => record.recordId)).toEqual([2, 3, 1]);
    });

    test('calculates each record total using its effective exchange rate', () => {
        const groups = buildExchangeRateGroups(
            [createRow({ RMB: 83.6, HKD: 10, Add: 5, Shipping: 2, Rate: null })],
            '0.836',
        );

        expect(groups[0].records[0].total.toFixed(2)).toBe('117.00');
    });

    test('supports both planned display bases without binary floating-point arithmetic', () => {
        const [group] = buildExchangeRateGroups([createRow()], '0.836');

        expect(group.rate.mul(100).toFixed(2)).toBe('83.60');
        expect(new Decimal(100).div(group.rate).toFixed(2)).toBe('119.62');
    });

    test.each([0, -0.5])('rejects the non-positive effective rate %s instead of displaying invalid totals', rate => {
        expect(() => buildExchangeRateGroups([createRow({ Rate: rate })], '0.836')).toThrow(RangeError);
    });

    test('returns no groups for an empty month', () => {
        expect(buildExchangeRateGroups([], '0.836')).toEqual([]);
    });
});

describe('ExchangeRateCard', () => {
    test('returns the selected record date so Home can reuse its date-group scrolling lifecycle', async () => {
        const [group] = buildExchangeRateGroups(
            [createRow({ RecordID: 18, DateTime: '2026-08-18', Local: '東莞倉' })],
            '0.836',
        );
        const onRecordPress = jest.fn();
        let renderer: ReactTestRenderer.ReactTestRenderer;

        await ReactTestRenderer.act(() => {
            renderer = ReactTestRenderer.create(
                React.createElement(ExchangeRateCard, {
                    group,
                    rateBase: 'HKD',
                    showRecords: true,
                    elevation: 2,
                    testID: 'exchange-rate-card',
                    onRecordPress,
                }),
            );
        });

        await ReactTestRenderer.act(() => {
            renderer.root.findByProps({ testID: 'exchange-record-18' }).props.onPress();
        });

        expect(onRecordPress).toHaveBeenCalledTimes(1);
        expect(onRecordPress).toHaveBeenCalledWith('2026-08-18');

        await ReactTestRenderer.act(() => renderer.unmount());
    });
});
