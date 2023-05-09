import type { ICarModel } from '../../data'

import { indexListGroups, indexListKeys } from '../../data'
import { debounce } from '../../utils/debounce'

type BoundingClientRectCallbackResult = WechatMiniprogram.BoundingClientRectCallbackResult

interface ICustomCarModel extends ICarModel {
  isLoading: boolean
}

interface IIndexListGroup {
  key: string
  index: number
  height: string
  prevIndex: number
  lastIndex: number
  timer: number
  list: ICustomCarModel[]
}

const INDEX_LIST_ITEM_HEIGHT = 120 // 索引列表分组单个数据的高度

Page({
  /**
   * 页面数据
   */ 
  data: {
    select: 0,
    selectId: '',
    indexListKeys,
    indexListGroups: [] as IIndexListGroup[],
    _indexListItemHeight: `${INDEX_LIST_ITEM_HEIGHT}rpx`,
    _indexListRects: [] as BoundingClientRectCallbackResult[]
  },

  /**
   * 监听页面第一次加载
   */
  onLoad() {
    this.initIndexListGroupData()
  }, 

  /**
   * 初始化索引列表分组数据
   */
  initIndexListGroupData() {
    const list: IIndexListGroup[] = indexListKeys.map((key, index) => ({
      key,
      index,
      height: `${indexListGroups[key].length * INDEX_LIST_ITEM_HEIGHT}rpx`,
      prevIndex: 0,
      lastIndex: indexListGroups[key].length - 1,
      timer: 0,
      list: [],
    }))

    this.setData({
      indexListGroups: list,
    })

    wx.nextTick(() => {
      this.initChangeIndexListGroupsRender()
      this.initIndexListGroupsRect()
    })
  },

  /**
   * 初始化获取索引区域的 top
   */
  initIndexListGroupsRect() {
    const query = this.createSelectorQuery()
    query.selectAll('.index-list-column').boundingClientRect()
    query.exec((res: BoundingClientRectCallbackResult[][] = []) => {
      if (res[0]?.length) {
        this.data._indexListRects = res[0]
      }
    })
  }, 

  /**
   * 监听滚动
   */
  changeScroll(e: WechatMiniprogram.ScrollViewScroll) {
    const select = this.data.select
    const scrollTop = e.detail.scrollTop
    const _indexListRects = this.data._indexListRects
    const active = _indexListRects.findIndex((item) => Math.floor(scrollTop) - item.top < item.height)

    // 触发监听分组列表数据清空
    this.changeIndexListGroupsClear(this, scrollTop, active)

    if (select === active) {
      return
    }

    this.setData({
      select: active
    })
  }, 

  /**
   * 监听滚动时
   */
  changeIndexListGroupsClear: debounce((_this: any, scrollTop: number, index: number) => {
    const windowHeight = wx.getSystemInfoSync().windowHeight
    const _indexListRects: BoundingClientRectCallbackResult[] = _this.data._indexListRects
    const groupList: IIndexListGroup[] = _this.data.indexListGroups
    const dataObj: Record<string, any> = {}

    for (let i = 0; i < groupList.length; i++) {
      const { key, timer } = groupList[i]
      let isView = true

      if (i > index) {
        // 判断当前下面的分组是否在可视区域中
        isView = Math.floor(scrollTop) > (_indexListRects[i].top - windowHeight)
      }

      // 如果是在当前分组上面或在当前分组下面且不在显示视图区域中，则清空列表数据
      if (i < index || !isView) {
        // 如果当前有分片渲染
        if (timer) {
          clearTimeout(timer)
          dataObj[`indexListGroups[${i}].timer`] = 0
        }

        dataObj[`indexListGroups[${i}].list`] = []
        dataObj[`indexListGroups[${i}].prevIndex`] = 0
        dataObj[`indexListGroups[${i}].lastIndex`] = indexListGroups[key].length - 1
      }
    }

    _this.setData(dataObj)
  }), 

  /**
   * 点击右边字母
   */
  toggleKey(e: WechatMiniprogram.BaseEvent<{ index: number }>) {
    const index = e.mark?.index as number

    this.setData({
      select: index,
      selectId: `index-list-column-${index}`
    })
  },

  /**
   * 初始化监听索引分组渲染
   */
  initChangeIndexListGroupsRender() {
    const observer = this.createIntersectionObserver({ observeAll: true })
    observer.relativeToViewport({ top: 0, bottom: 0 }).observe('.index-list-column', (res) => {
      // 监听当前滚动分组的区域
      if (res.intersectionRatio > 0) {
        const index = res.dataset.index as number
        const { list } = this.data.indexListGroups[index]

        if (!list.length) {
          this.indexListGroupFragmentRender(index)
        }
      }
    })
  },

  /**
   * 处理索引分组分片渲染
   */
  indexListGroupFragmentRender(index: number) {
    const { key } = this.data.indexListGroups[index]
    const currentList = indexListGroups[key]
    const initList: ICustomCarModel[] = currentList.map((item) => ({ ...item, isLoading: false }))

    this.setData({
      [`indexListGroups[${index}].list`]: initList
    })

    wx.nextTick(() => {
      this.handleFragmentRender(index)
    })
  },

  /**
   * 分片渲染
   */
  handleFragmentRender(index: number) {
    const { prevIndex, lastIndex } = this.data.indexListGroups[index]
    const dataObj: Record<string, any> = {}
    let fragmentCount = 4 // 分片渲染的数量
    let currentPrevIndex = prevIndex
    let currentLastIndex = lastIndex

    // 判断是否有数据分片
    if (lastIndex - prevIndex < 0) {
      return
    }

    // 判断是否剩余的数量不够初始分片的数量
    if ((currentLastIndex - currentPrevIndex) + 1 < fragmentCount) {
      fragmentCount = (currentLastIndex - currentPrevIndex) + 1
    }

    while (currentPrevIndex < prevIndex + fragmentCount) {
      const _key = `indexListGroups[${index}].list[${currentPrevIndex}]`
      dataObj[`${_key}.isLoading`] = true
      currentPrevIndex++
    }

    // 判断是否底部还能渲染
    if (lastIndex - currentPrevIndex >= 0) {

      // 判断是否剩余的数量不够初始分片的数量
      if ((currentLastIndex - currentPrevIndex) + 1 < fragmentCount) {
        fragmentCount = (currentLastIndex - currentPrevIndex) + 1
      }

      while (currentLastIndex > lastIndex - fragmentCount) {
        const _key = `indexListGroups[${index}].list[${currentLastIndex}]`
        dataObj[`${_key}.isLoading`] = true
        currentLastIndex--
      }

    }

    this.data.indexListGroups[index].prevIndex = currentPrevIndex
    this.data.indexListGroups[index].lastIndex = currentLastIndex
    this.setData(dataObj)
    
    // 判断是否还能继续分片，如果有采用异步递归
    if (currentLastIndex - currentPrevIndex >= 0) {
      this.data.indexListGroups[index].timer = setTimeout(() => {
        this.handleFragmentRender(index)
      }, 500)
    }
  }, 
})