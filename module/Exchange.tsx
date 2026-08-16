import Decimal from 'decimal.js';
import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    ToastAndroid,
    TouchableWithoutFeedback,
    useWindowDimensions,
    View,
} from 'react-native';
import {
    ActivityIndicator,
    Card,
    Divider,
    IconButton,
    MD2Theme,
    Portal,
    SegmentedButtons,
    Text,
    TouchableRipple,
    useTheme,
} from 'react-native-paper';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResultSet } from 'react-native-sqlite-storage';
import { Color } from './Color';
import formatPrice from './formatPrice';
import { DB } from './SQLite';

type ExchangeRateBase = 'HKD' | 'RMB';

/** Database fields required to identify a record's effective exchange rate and total. */
interface ExchangeRecordRow {
    RecordID: number;
    DateTime: string;
    Local: string;
    RMB: number;
    HKD: number;
    Add: number;
    Shipping: number;
    Rate: number | null;
}

/** Record summary shown inside an exchange-rate card. */
interface ExchangeRecordSummary {
    recordId: number;
    dateTime: string;
    local: string;
    total: Decimal;
}

/** Records sharing one effective exchange rate, ordered newest first. */
interface ExchangeRateGroup {
    rate: Decimal;
    records: ExchangeRecordSummary[];
}

/** Controls the monthly exchange-rate drawer from the Home screen. */
interface ExchangeProps {
    /** Whether the drawer should be open. */
    open: boolean;
    /** Requests that the Home screen close the drawer. */
    onClose: () => void;
    /** Month currently displayed by the Home screen. */
    showDay: Date;
    /** Configured rate used by legacy records whose stored Rate is null. */
    settingRate?: string;
    /** Selects a Home date group from a record shown in the drawer. */
    onRecordPress: (dateTime: string) => void;
}

interface ExchangeRateCardProps {
    group: ExchangeRateGroup;
    rateBase: ExchangeRateBase;
    showRecords: boolean;
    elevation: 2 | 3;
    testID: string;
    /** Forwards the persisted record date so Home remains the owner of list positioning. */
    onRecordPress: (dateTime: string) => void;
}

const ANIMATION_DURATION = 260;

/**
 * Groups monthly records by their effective rate and keeps the most-used, most-recent group first.
 *
 * Keeping this transformation independent from SQLite makes the rate-selection and money rules directly testable.
 *
 * @param rows - Monthly records returned by the parameterized SQLite query.
 * @param settingRate - User setting applied only when a stored record rate is null.
 * @returns Rate groups ordered by usage count, latest record date, and latest record ID.
 * @throws RangeError when a stored or configured rate cannot produce a valid conversion.
 */
function buildExchangeRateGroups(rows: ExchangeRecordRow[], settingRate: string | number): ExchangeRateGroup[] {
    const groupMap = new Map<string, ExchangeRateGroup>();

    // Build rate groups
    for (const row of rows) {
        const rate = new Decimal(row.Rate ?? settingRate);
        if (!rate.isFinite() || rate.lte(0)) {
            throw new RangeError('Exchange rates must be finite and greater than zero.');
        }

        const rateKey = rate.toString();
        const total = new Decimal(row.RMB).div(rate).add(row.HKD).add(row.Add).add(row.Shipping);
        const record = {
            recordId: row.RecordID,
            dateTime: row.DateTime,
            local: row.Local,
            total,
        };
        const existingGroup = groupMap.get(rateKey);

        if (existingGroup) {
            existingGroup.records.push(record);
        } else {
            groupMap.set(rateKey, {
                rate,
                records: [record],
            });
        }
    }

    // Order records within each rate
    const groups = Array.from(groupMap.values());
    for (const group of groups) {
        group.records.sort((left, right) => {
            const dateDifference = moment(right.dateTime).valueOf() - moment(left.dateTime).valueOf();
            return dateDifference || right.recordId - left.recordId;
        });
    }

    // Select the primary rate
    groups.sort((left, right) => {
        const usageDifference = right.records.length - left.records.length;
        const dateDifference = moment(right.records[0].dateTime).valueOf() - moment(left.records[0].dateTime).valueOf();
        return usageDifference || dateDifference || right.records[0].recordId - left.records[0].recordId;
    });

    return groups;
}

/** Displays one effective rate and forwards visible record selections to Home. */
const ExchangeRateCard: React.FC<ExchangeRateCardProps> = ({
    group,
    rateBase,
    showRecords,
    elevation,
    testID,
    onRecordPress,
}) => {
    // Display conversion
    const sourceCurrency = rateBase === 'HKD' ? '港幣' : '人民幣';
    const targetCurrency = rateBase === 'HKD' ? '人民幣' : '港幣';
    const convertedRate = rateBase === 'HKD' ? group.rate.mul(100) : new Decimal(100).div(group.rate);

    return (
        <Card mode={'elevated'} elevation={elevation} style={STYLE.card} testID={testID}>
            <Card.Content style={STYLE.cardContent}>
                {/* Rate summary */}
                <View style={STYLE.rateRow}>
                    <Text style={STYLE.rateText}>
                        100 {sourceCurrency} = {targetCurrency}{' '}
                        <Text style={STYLE.rateValue}>{formatPrice(convertedRate.toFixed(2))}</Text>
                    </Text>
                    <Text style={STYLE.usageText}>{group.records.length} 筆</Text>
                </View>

                {/* Record details */}
                {showRecords
                    ? group.records.map(record => (
                          <React.Fragment key={record.recordId}>
                              <Divider style={STYLE.recordDivider} />
                              <TouchableRipple
                                  onPress={() => onRecordPress(record.dateTime)}
                                  accessibilityRole={'button'}
                                  accessibilityLabel={`前往 ${moment(record.dateTime).format('MM月DD日')} ${
                                      record.local
                                  }`}
                                  testID={`exchange-record-${record.recordId}`}
                              >
                                  <View style={STYLE.recordRow}>
                                      <View style={STYLE.recordIdentity}>
                                          <Text style={STYLE.recordDate}>
                                              {moment(record.dateTime).format('MM月DD日')}
                                          </Text>
                                          <Text numberOfLines={1} ellipsizeMode={'tail'} style={STYLE.recordLocation}>
                                              {record.local}
                                          </Text>
                                      </View>
                                      <Text style={STYLE.recordTotal}>HK$ {formatPrice(record.total.toFixed(2))}</Text>
                                  </View>
                              </TouchableRipple>
                          </React.Fragment>
                      ))
                    : null}
            </Card.Content>
        </Card>
    );
};

/** Shows the rates recorded for the month currently selected on Home. */
export const Exchange: React.FC<ExchangeProps> = ({ open, onClose, showDay, settingRate, onRecordPress }) => {
    const theme = useTheme<MD2Theme>();
    const insets = useSafeAreaInsets();
    const drawerHeight = useWindowDimensions().height * 0.75;

    // Drawer state
    const [isMounted, setIsMounted] = useState(open);
    const [rateBase, setRateBase] = useState<ExchangeRateBase>('HKD');

    // Monthly data
    const [groups, setGroups] = useState<ExchangeRateGroup[]>([]);
    const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'invalid-rate' | 'error'>('idle');

    // Drawer animation
    const animationProgress = useSharedValue(0);
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(animationProgress.value, [0, 1], [0, 1]),
    }));
    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: interpolate(animationProgress.value, [0, 1], [drawerHeight, 0]) }],
    }));

    // Open and close lifecycle
    useEffect(() => {
        if (open) {
            setRateBase('HKD');
            setIsMounted(true);
            return;
        }

        animationProgress.value = withTiming(0, { duration: ANIMATION_DURATION }, finished => {
            if (finished) runOnJS(setIsMounted)(false);
        });
    }, [animationProgress, open]);

    useEffect(() => {
        if (isMounted && open) {
            animationProgress.value = withTiming(1, { duration: ANIMATION_DURATION });
        }
    }, [animationProgress, isMounted, open]);

    // Load selected month
    useEffect(() => {
        if (!open || settingRate === undefined) return;

        let isCurrentRequest = true;
        setLoadState('loading');
        setGroups([]);

        const loadMonthlyRates = async () => {
            try {
                const rows: ExchangeRecordRow[] = [];
                await DB.readTransaction(async transaction => {
                    const [, resultSet]: [unknown, ResultSet] = await transaction.executeSql(
                        `SELECT RecordID, DateTime, Local, RMB, HKD, "Add", Shipping, Rate
                         FROM Record
                         WHERE STRFTIME('%m', DateTime) = ?
                           AND STRFTIME('%Y', DateTime) = ?
                         ORDER BY DateTime DESC, RecordID DESC`,
                        [moment(showDay).format('MM'), moment(showDay).format('YYYY')],
                    );

                    for (let index = 0; index < resultSet.rows.length; index++) {
                        rows.push(resultSet.rows.item(index) as ExchangeRecordRow);
                    }
                });

                if (!isCurrentRequest) return;
                setGroups(buildExchangeRateGroups(rows, settingRate));
                setLoadState('ready');
            } catch (error) {
                if (!isCurrentRequest) return;
                const message = error instanceof Error ? error.message : String(error);
                console.error('讀取已記錄匯率失敗: ' + message);
                if (error instanceof RangeError) {
                    ToastAndroid.show('本月紀錄包含無效匯率', ToastAndroid.SHORT);
                    setLoadState('invalid-rate');
                } else {
                    ToastAndroid.show('讀取已記錄匯率失敗', ToastAndroid.SHORT);
                    setLoadState('error');
                }
            }
        };

        loadMonthlyRates().then();
        return () => {
            // Ignore an older month query when the drawer closes or its inputs change.
            isCurrentRequest = false;
        };
    }, [open, settingRate, showDay]);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    if (!isMounted) return null;

    const primaryGroup = groups[0];
    const otherGroups = groups.slice(1);

    return (
        <Portal>
            <View style={STYLE.portal} testID={'exchange-drawer'}>
                {/* Backdrop */}
                <TouchableWithoutFeedback onPress={handleClose} accessibilityLabel={'關閉已記錄匯率'}>
                    <Animated.View style={[STYLE.backdrop, backdropStyle]} />
                </TouchableWithoutFeedback>

                {/* Drawer */}
                <Animated.View
                    style={[
                        STYLE.drawer,
                        drawerStyle,
                        {
                            height: drawerHeight,
                            paddingBottom: insets.bottom,
                            backgroundColor: theme.colors.background,
                        },
                    ]}
                >
                    {/* Drawer header */}
                    <View style={STYLE.header}>
                        <Text style={STYLE.title}>{moment(showDay).format('YYYY年M月')}・已記錄匯率</Text>
                        <IconButton
                            icon={'close'}
                            onPress={handleClose}
                            accessibilityLabel={'關閉已記錄匯率'}
                            testID={'exchange-close'}
                        />
                    </View>

                    {/* Rate base */}
                    <SegmentedButtons<ExchangeRateBase>
                        value={rateBase}
                        onValueChange={setRateBase}
                        density={'small'}
                        style={STYLE.segmentedButtons}
                        buttons={[
                            {
                                value: 'HKD',
                                label: '每 100 港幣',
                                accessibilityLabel: '以每 100 港幣顯示匯率',
                                testID: 'exchange-rate-base-hkd',
                            },
                            {
                                value: 'RMB',
                                label: '每 100 人民幣',
                                accessibilityLabel: '以每 100 人民幣顯示匯率',
                                testID: 'exchange-rate-base-rmb',
                            },
                        ]}
                    />

                    {/* Monthly rates */}
                    <ScrollView
                        contentContainerStyle={STYLE.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps={'handled'}
                    >
                        {loadState === 'loading' || (settingRate === undefined && loadState === 'idle') ? (
                            <View style={STYLE.feedback}>
                                <ActivityIndicator animating={true} color={Color.primaryColor} />
                                <Text style={STYLE.feedbackText}>正在讀取匯率紀錄...</Text>
                            </View>
                        ) : null}

                        {loadState === 'error' ? (
                            <View style={STYLE.feedback}>
                                <Text style={STYLE.feedbackText}>未能讀取本月匯率紀錄</Text>
                            </View>
                        ) : null}

                        {loadState === 'invalid-rate' ? (
                            <View style={STYLE.feedback}>
                                <Text style={STYLE.feedbackText}>本月紀錄包含無效匯率，無法計算匯率資料</Text>
                            </View>
                        ) : null}

                        {loadState === 'ready' && !primaryGroup ? (
                            <View style={STYLE.feedback}>
                                <Text style={STYLE.feedbackText}>本月沒有已記錄匯率</Text>
                            </View>
                        ) : null}

                        {loadState === 'ready' && primaryGroup ? (
                            <>
                                {/* Primary rate */}
                                <Text style={STYLE.sectionTitle}>主要使用匯率</Text>
                                <ExchangeRateCard
                                    group={primaryGroup}
                                    rateBase={rateBase}
                                    showRecords={false}
                                    elevation={3}
                                    testID={'exchange-primary-card'}
                                    onRecordPress={onRecordPress}
                                />

                                {/* Other rates */}
                                <Text style={STYLE.sectionTitle}>其他已使用匯率</Text>
                                {otherGroups.length > 0 ? (
                                    otherGroups.map(group => (
                                        <ExchangeRateCard
                                            key={group.rate.toString()}
                                            group={group}
                                            rateBase={rateBase}
                                            showRecords={true}
                                            elevation={2}
                                            testID={'exchange-other-card-' + group.rate.toString()}
                                            onRecordPress={onRecordPress}
                                        />
                                    ))
                                ) : (
                                    <Text style={STYLE.noOtherRates}>本月沒有其他匯率</Text>
                                )}
                            </>
                        ) : null}
                    </ScrollView>
                </Animated.View>
            </View>
        </Portal>
    );
};

const STYLE = StyleSheet.create({
    portal: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        zIndex: 10,
        elevation: 10,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.48)',
    },
    drawer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        elevation: 12,
        overflow: 'hidden',
    },
    header: {
        minHeight: 64,
        paddingLeft: 20,
        paddingRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        flex: 1,
        fontSize: 21,
        fontWeight: 'bold',
    },
    segmentedButtons: {
        marginHorizontal: 20,
        marginBottom: 8,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 24,
    },
    sectionTitle: {
        marginTop: 12,
        marginBottom: 10,
        color: Color.textGary,
        fontSize: 15,
        fontWeight: 'bold',
    },
    card: {
        marginBottom: 12,
        borderRadius: 16,
    },
    cardContent: {
        paddingVertical: 6,
    },
    rateRow: {
        minHeight: 60,
        flexDirection: 'row',
        alignItems: 'center',
    },
    rateText: {
        flex: 1,
        fontSize: 18,
        fontWeight: '500',
    },
    rateValue: {
        color: Color.primaryColor,
        fontSize: 22,
        fontWeight: 'bold',
    },
    usageText: {
        marginLeft: 12,
        color: Color.textGary,
        fontSize: 13,
    },
    recordDivider: {
        marginHorizontal: -16,
    },
    recordRow: {
        minHeight: 60,
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordIdentity: {
        minWidth: 0,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordDate: {
        marginRight: 12,
        color: Color.textGary,
        fontSize: 14,
    },
    recordLocation: {
        minWidth: 0,
        flex: 1,
        fontSize: 15,
    },
    recordTotal: {
        marginLeft: 12,
        color: Color.primaryColor,
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'right',
    },
    feedback: {
        minHeight: 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    feedbackText: {
        marginTop: 12,
        color: Color.textGary,
        textAlign: 'center',
    },
    noOtherRates: {
        paddingVertical: 16,
        color: Color.textGary,
        textAlign: 'center',
    },
});

export { buildExchangeRateGroups, ExchangeRateCard };
export type { ExchangeProps, ExchangeRateBase, ExchangeRateGroup, ExchangeRecordRow };
