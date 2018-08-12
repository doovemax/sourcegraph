import { CommandContribution, ExecuteCommandParams } from 'cxp/module/protocol'
import * as React from 'react'
import { from, Subject, Subscription } from 'rxjs'
import { catchError, map, mapTo, mergeMap, startWith, tap } from 'rxjs/operators'
import { ExtensionsProps } from '../../context'
import { CXPControllerProps } from '../../cxp/controller'
import { asError, ErrorLike } from '../../errors'
import { ConfigurationSubject, Settings } from '../../settings'
import { LinkOrButton } from '../../ui/generic/LinkOrButton'

export interface ActionItemProps {
    contribution: CommandContribution
    variant?: 'actionItem'
    className?: string

    /** Called when the item's command is executed. */
    onCommandExecute?: () => void

    /**
     * Whether to set the disabled attribute on the element when command execution is started and not yet finished.
     */
    disabledDuringExecution?: boolean

    /** Instead of showing the icon and/or title, show this element. */
    title?: React.ReactElement<any>
}

interface Props<S extends ConfigurationSubject, C extends Settings>
    extends ActionItemProps,
        CXPControllerProps<S, C>,
        ExtensionsProps<S, C> {}

const LOADING: 'loading' = 'loading'

interface State {
    /** The executed action: undefined while loading, null when done or not started, or an error. */
    actionOrError: typeof LOADING | null | ErrorLike
}

export class ActionItem<S extends ConfigurationSubject, C extends Settings> extends React.PureComponent<
    Props<S, C>,
    State
> {
    public state: State = { actionOrError: null }

    private commandExecutions = new Subject<ExecuteCommandParams>()
    private subscriptions = new Subscription()

    public componentDidMount(): void {
        this.subscriptions.add(
            this.commandExecutions
                .pipe(
                    mergeMap(params =>
                        from(this.props.cxpController.registries.commands.executeCommand(params)).pipe(
                            mapTo(null),
                            tap(() => {
                                if (this.props.onCommandExecute) {
                                    this.props.onCommandExecute()
                                }
                            }),
                            catchError(error => [asError(error)]),
                            map(c => ({ actionOrError: c })),
                            startWith<Pick<State, 'actionOrError'>>({ actionOrError: LOADING })
                        )
                    )
                )
                .subscribe(stateUpdate => this.setState(stateUpdate), error => console.error(error))
        )
    }

    public componentDidUpdate(prevProps: Props<S, C>, prevState: State): void {
        // If the tooltip changes while it's visible, we need to force-update it to show the new value.
        const prevTooltip = prevProps.contribution.actionItem && prevProps.contribution.actionItem.description
        const tooltip = this.props.contribution.actionItem && this.props.contribution.actionItem.description
        if (prevTooltip !== tooltip) {
            this.props.extensions.context.forceUpdateTooltip()
        }
    }

    public componentWillUnmount(): void {
        this.subscriptions.unsubscribe()
    }

    public render(): JSX.Element | null {
        let content: JSX.Element | string | undefined
        let tooltip: string | undefined
        if (this.props.title) {
            content = this.props.title
            tooltip = this.props.contribution.description
        } else if (this.props.variant === 'actionItem' && this.props.contribution.actionItem) {
            content = (
                <>
                    {this.props.contribution.actionItem.iconURL && (
                        <img
                            src={this.props.contribution.actionItem.iconURL}
                            alt={this.props.contribution.actionItem.iconDescription}
                            className="icon-inline"
                        />
                    )}{' '}
                    {this.props.contribution.actionItem.label}
                </>
            )
            tooltip = this.props.contribution.actionItem.description
        } else {
            content = (
                <>
                    {this.props.contribution.iconURL && (
                        <img src={this.props.contribution.iconURL} className="icon-inline" />
                    )}{' '}
                    {this.props.contribution.category ? `${this.props.contribution.category}: ` : ''}
                    {this.props.contribution.title}
                </>
            )
            tooltip = this.props.contribution.description
        }

        return (
            <LinkOrButton
                data-tooltip={tooltip}
                disabled={this.props.disabledDuringExecution && this.state.actionOrError === LOADING}
                onSelect={this.runAction}
                className={this.props.className}
            >
                {content}
            </LinkOrButton>
        )
    }

    public runAction = () => this.commandExecutions.next({ command: this.props.contribution.command })
}