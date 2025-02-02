import { Children, cloneElement, isValidElement, memo, PropsWithChildren, SyntheticEvent } from 'react'

import { sendAnalyticsEvent } from '.'
import { Event, EventName } from './constants'
import { ITraceContext, Trace, TraceContext } from './Trace'

type TraceEventProps = {
  events: Event[]
  name: EventName
  properties?: Record<string, unknown>
} & ITraceContext

/**
 * Analytics instrumentation component that wraps event callbacks with logging logic.
 *
 * @example
 *  <TraceEvent events={[Event.onClick]} element={ElementName.SWAP_BUTTON}>
 *    <Button onClick={() => console.log('clicked')}>Click me</Button>
 *  </TraceEvent>
 */
export const TraceEvent = memo((props: PropsWithChildren<TraceEventProps>) => {
  const { name, properties, events, children, ...traceProps } = props

  return (
    <Trace {...traceProps}>
      <TraceContext.Consumer>
        {(traceContext) =>
          Children.map(children, (child) => {
            if (!isValidElement(child)) {
              return child
            }

            // For each child, augment event handlers defined in `actionNames`  with event tracing
            return cloneElement(child, getEventHandlers(child, traceContext, events, name, properties))
          })
        }
      </TraceContext.Consumer>
    </Trace>
  )
})

TraceEvent.displayName = 'TraceEvent'

/**
 * Given a set of child element and action props, returns a spreadable
 * object of the event handlers augmented with analytics logging.
 */
function getEventHandlers(
  child: React.ReactElement,
  traceContext: ITraceContext,
  events: Event[],
  name: EventName,
  properties?: Record<string, unknown>
) {
  const eventHandlers: Partial<Record<Event, (e: SyntheticEvent<Element, Event>) => void>> = {}

  for (const event of events) {
    eventHandlers[event] = (eventHandlerArgs: unknown) => {
      // call child event handler with original arguments, must be in array
      const args = Array.isArray(eventHandlerArgs) ? eventHandlerArgs : [eventHandlerArgs]
      child.props[event]?.apply(child, args)

      // augment handler with analytics logging
      sendAnalyticsEvent(name, { ...traceContext, ...properties })
    }
  }

  // return a spreadable event handler object
  return eventHandlers
}
