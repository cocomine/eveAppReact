import Animated, {LinearTransition, StretchInX} from 'react-native-reanimated';
import {ActivityIndicator, Button, IconButton as PaperIconButton, Menu} from 'react-native-paper';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Modal, StyleSheet, ToastAndroid, TouchableWithoutFeedback, View} from 'react-native';
import {
    Asset,
    CameraOptions,
    ImageLibraryOptions,
    ImagePickerResponse,
    launchCamera,
    launchImageLibrary,
} from 'react-native-image-picker';
import {Color} from '../module/Color';
import ImageViewer from 'react-native-image-zoom-viewer';
import {IImageInfo} from 'react-native-image-zoom-viewer/src/image-viewer.type.ts';

const IconButton = Animated.createAnimatedComponent(PaperIconButton);
/* 圖片選擇器Options */
const IMAGE_PICKER_OPTIONS: CameraOptions | ImageLibraryOptions = {
    mediaType: 'photo',
    quality: 0.8,
    cameraType: 'back',
    includeBase64: true,
    includeExtra: false,
    saveToPhotos: true,
    selectionLimit: 3,
};

interface Props {
    onSelectedImage: (images: Asset[]) => void;
    assets?: Asset[];
}

/**
 * 圖片選擇器
 */
const ImagePicker = ({onSelectedImage, assets = []}: Props) => {
    const [is_mode_dropdown_shown, setIsModeDropdownShown] = useState(false);
    const [images, setImages] = useState<Asset[]>(assets); //圖片
    const [big_image_index, setBigImageIndex] = useState<number | null>(null); //大圖

    /* 處理結果 */
    const fetchResult = useCallback(
        (result: ImagePickerResponse) => {
            if (result.didCancel) return;
            if (result.errorMessage) return;
            if (result.errorCode === 'camera_unavailable') {
                ToastAndroid.show('相機不可用', ToastAndroid.SHORT);
                return;
            }
            if (result.errorCode === 'permission') {
                ToastAndroid.show('沒有權限', ToastAndroid.SHORT);
                return;
            }

            //處理圖片
            if (!result.assets) return;
            const img_base64 = [...result.assets];
            img_base64.push(...images);
            img_base64.splice(3);

            setImages(img_base64);
            onSelectedImage(img_base64);
        },
        [images, onSelectedImage],
    );

    /* 打開選擇器 */
    const openPicker = useCallback(
        (type: number) => {
            setIsModeDropdownShown(false);
            if (type === 0) {
                //相機
                launchCamera(IMAGE_PICKER_OPTIONS).then(fetchResult);
            } else if (type === 1) {
                //相簿
                launchImageLibrary(IMAGE_PICKER_OPTIONS).then(fetchResult);
            }
        },
        [fetchResult],
    );

    /* 圖片檢視器列表 */
    const images_viewer_list: IImageInfo[] = useMemo(() => {
        return images.map((assets1, index) => ({
            url: 'data:image/jpeg;base64,' + assets1.base64,
            width: assets1.width,
            height: assets1.height,
            props: {
                key: index,
            },
        }));
    }, [images]);

    /* 參數更新 */
    useEffect(() => {
        setImages(assets);
    }, [assets]);

    return (
        <View style={{flex: 1}}>
            <Menu
                visible={is_mode_dropdown_shown}
                onDismiss={() => setIsModeDropdownShown(false)}
                anchor={
                    <Button icon={'camera'} mode={'outlined'} onPress={() => setIsModeDropdownShown(true)}>
                        選擇圖片
                    </Button>
                }>
                <Menu.Item onPress={() => openPicker(0)} title={'相機'} leadingIcon={'camera'} key={1} />
                <Menu.Item onPress={() => openPicker(1)} title={'相簿'} leadingIcon={'image-album'} key={2} />
            </Menu>
            <View style={[style.form_group]}>
                {images.map((assets2, index) => (
                    <Animated.View
                        style={[style.img_view, {marginLeft: index !== 0 ? 5 : undefined}]}
                        entering={StretchInX}
                        layout={LinearTransition.duration(300).delay(300)}
                        key={index}>
                        <TouchableWithoutFeedback onPress={() => setBigImageIndex(index)}>
                            <Animated.Image
                                source={{uri: 'data:image/jpeg;base64,' + assets2.base64}}
                                style={{flex: 1}}
                                layout={LinearTransition.duration(300).delay(300)}
                            />
                        </TouchableWithoutFeedback>
                        <IconButton
                            icon={'close'}
                            size={20}
                            iconColor={Color.white}
                            containerColor={Color.darkBlock}
                            style={{position: 'absolute', top: 0, right: 0}}
                            onPress={() => {
                                const newImages = images.filter((_, i) => i !== index);
                                setImages(newImages);
                                onSelectedImage(newImages);
                            }}
                            layout={LinearTransition.duration(300).delay(300)}
                        />
                    </Animated.View>
                ))}
            </View>
            <Modal
                visible={big_image_index !== null}
                transparent={true}
                animationType={'fade'}
                onRequestClose={() => setBigImageIndex(null)}>
                <ImageViewer
                    backgroundColor={'rgba(0,0,0,0.6)'}
                    imageUrls={images_viewer_list}
                    index={big_image_index ?? 0}
                    onCancel={() => setBigImageIndex(null)}
                    loadingRender={() => <ActivityIndicator animating={true} />}
                    enableSwipeDown={true}
                    footerContainerStyle={{width: '100%', position: 'absolute', bottom: 20, zIndex: 9999}}
                    renderFooter={() => (
                        <View style={[style.flex_row, {justifyContent: 'center'}]}>
                            <IconButton
                                icon={'close'}
                                size={30}
                                iconColor={Color.white}
                                style={style.image_viewer_close_btn}
                                onPress={() => setBigImageIndex(null)}
                            />
                        </View>
                    )}
                />
            </Modal>
        </View>
    );
};

const style = StyleSheet.create({
    image_viewer_close_btn: {
        borderColor: Color.white,
        borderStyle: 'solid',
        borderWidth: 1,
    },
    img_view: {
        flex: 1,
        height: 150,
        borderRadius: 5,
        overflow: 'hidden',
    },
    form_group: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    flex_row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export {ImagePicker};
