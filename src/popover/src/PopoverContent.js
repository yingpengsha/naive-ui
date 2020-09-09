import popoverManager from './PopoverManager'
import clickoutside from '../../_directives/clickoutside'
import mousemoveoutside from '../../_directives/mousemoveoutside'
import placeable from '../../_mixins/placeable'
import zindexable from '../../_mixins/zindexable'
import withapp from '../../_mixins/withapp'
import themeable from '../../_mixins/themeable'
import formatLength from '../../_utils/css/formatLength'
import getDefaultSlot from '../../_utils/vue/getDefaultSlot'
import usecssr from '../../_mixins/usecssr'
import styles from './styles'

export default {
  name: 'NPopoverContent',
  props: {
    id: {
      type: String,
      required: true
    },
    show: {
      type: Boolean,
      default: false
    },
    trigger: {
      type: String,
      default: 'click'
    },
    arrow: {
      type: Boolean,
      default: true
    },
    delay: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number,
      default: 300
    },
    controller: {
      type: Object,
      default: null
    },
    width: {
      type: Number,
      default: null
    },
    minWidth: {
      type: Number,
      default: null
    },
    maxWidth: {
      type: Number,
      default: null
    },
    shadow: {
      type: Boolean,
      default: true
    },
    raw: {
      type: Boolean,
      default: false
    },
    manuallyPositioned: {
      type: Boolean,
      default: false
    },
    containerClass: {
      type: String,
      default: undefined
    },
    overlayClass: {
      type: String,
      default: null
    },
    overlayStyle: {
      type: Object,
      default: undefined
    },
    arrowStyle: {
      type: Object,
      default: undefined
    },
    displayDirective: {
      type: String,
      default: 'if'
    }
  },
  cssrName: 'Popover',
  mixins: [
    withapp,
    themeable,
    placeable,
    zindexable,
    usecssr(styles)
  ],
  directives: {
    clickoutside,
    mousemoveoutside
  },
  data () {
    return {
      memorizedId: null,
      internalActive: false,
      keepPlaceableTracingWhenInactive: false,
      zindexable: true
    }
  },
  created () {
    this.memorizedId = this.id
    popoverManager.registerContent(this.memorizedId, this)
    if (this.active) this.keepPlaceableTracingWhenInactive = true
    if (this.controller) {
      this.controller.updatePosition = this.updatePosition
    }
  },
  watch: {
    active (value) {
      if (value) {
        this.$parent.transferElement()
        this.$emit('show')
      } else {
        this.$emit('hide')
      }
    }
  },
  computed: {
    style () {
      const style = {}
      const width = this.width
      if (width) {
        style.width = formatLength(width)
      }
      const maxWidth = this.maxWidth
      if (maxWidth) {
        style.maxWidth = formatLength(maxWidth)
      }
      const minWidth = this.minWidth
      if (minWidth) {
        style.minWidth = formatLength(minWidth)
      }
      if (this.overlayStyle) {
        Object.assign(style, this.overlayStyle)
      }
      return style
    },
    triggeredByClick () {
      return this.trigger === 'click'
    },
    triggeredByHover () {
      return this.trigger === 'hover'
    },
    triggeredByManual () {
      return this.trigger === 'manual'
    },
    active () {
      if (this.trigger === 'manual') return this.show
      else return this.internalActive
    }
  },
  mounted () {
    if (this.active) {
      this.$parent.transferElement()
    }
  },
  beforeUpdate () {
    if (this.controller) {
      this.controller.updatePosition = this.updatePosition
    }
  },
  beforeDestroy () {
    popoverManager.unregisterContent(this.memorizedId)
  },
  methods: {
    cancelVanishTimer () {
      const activator = this.activator()
      if (activator) {
        window.clearTimeout(activator.vanishTimerId)
        activator.vanishTimerId = null
      }
    },
    activate () {
      const activator = this.activator()
      if (activator && !activator.active) {
        activator.internalActive = true
      }
      this.internalActive = true
    },
    deactivate () {
      const activator = this.activator()
      if (activator && activator.active) {
        activator.internalActive = false
      }
      this.internalActive = false
    },
    activator () {
      return popoverManager.getActivatorInstance(this.memorizedId)
    },
    handleMouseEnter () {
      this.cancelVanishTimer()
    },
    handleMouseLeave (e) {
      if (this.triggeredByHover) {
        if (!this.active) return
        this.cancelVanishTimer()
        const activator = this.activator()
        activator.vanishTimerId = window.setTimeout(() => {
          if (activator && activator.$el) {
            const activatorEl = activator.$el
            if (activatorEl.contains(e.target)) {
              return
            }
          }
          activator.vanishTimerId = null
          this.deactivate()
        }, this.duration)
      }
    },
    handleMouseMoveOutside (e) {
      if (this.triggeredByHover) {
        this.handleMouseLeave(e)
      }
    },
    handleClickOutside (e) {
      if (this.triggeredByClick) {
        const activator = this.activator()
        if (activator && activator.$el) {
          const activatorEl = activator.$el
          if (activatorEl.contains(e.target)) {
            return
          }
        }
        this.deactivate()
      }
    },
    getTrackingElement () {
      return this.$refs.content
    },
    getTrackedElement () {
      return this.activator().$el
    },
    getAbsoluteOffsetContainer () {
      return this.$refs.contentContainer
    },
    getZindexableContent () {
      return this.$el
    }
  },
  render (h) {
    const vShow = this.displayDirective === 'show'
    const directives = [
      {
        name: 'clickoutside',
        value: this.handleClickOutside
      },
      {
        name: 'mousemoveoutside',
        value: this.handleMouseMoveOutside
      }
    ]
    if (vShow) {
      directives.push({
        name: 'show',
        value: this.active
      })
    }
    return h('div', {
      staticClass: 'n-positioning-container',
      class: {
        [this.containerClass]: true,
        [this.namespace]: this.namespace
      },
      ref: 'contentContainer'
    }, [
      h('div', {
        staticClass: 'n-positioning-content',
        ref: 'content'
      }, [
        h('transition', {
          props: {
            name: 'popover-content-transition'
          },
          on: {
            enter: () => {
              this.keepPlaceableTracingWhenInactive = true
            },
            afterLeave: () => {
              this.keepPlaceableTracingWhenInactive = false
            }
          }
        }, [
          (vShow || this.active) ? h('div', {
            attrs: {
              'n-placement': this.adjustedPlacement
            },
            staticClass: 'n-popover-content',
            class: {
              'n-popover-content--no-arrow': !this.arrow,
              [`n-${this.syntheticTheme}-theme`]: this.syntheticTheme,
              'n-popover-content--shadow': this.shadow,
              [this.overlayClass]: this.overlayClass,
              'n-popover-content--styled': !this.raw,
              'n-popover-content--fix-width': this.width !== null || this.maxWidth !== null
            },
            style: this.style,
            directives,
            on: {
              mouseenter: this.handleMouseEnter,
              mouseleave: this.handleMouseLeave
            }
          }, [
            ...getDefaultSlot(this),
            this.arrow
              ? h(
                'div',
                {
                  staticClass: 'n-popover-arrow-wrapper'
                }, [
                  h('div', {
                    staticClass: 'n-popover-arrow',
                    style: this.arrowStyle
                  })
                ])
              : null
          ]) : null
        ])
      ])
    ])
  }
}