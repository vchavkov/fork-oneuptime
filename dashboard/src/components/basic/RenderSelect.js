import React from 'react';
import PropTypes from 'prop-types'

const RenderSelect = ({ input, placeholder, className, disabled, style, meta, children,message, id }) => (
    <span>
        <span>
            <select {...input} placeholder={placeholder} className={className} id={id} disabled={disabled || false} style={style || {}}>
                {children}
            </select>
        </span>
        {message && message.length && <span style={{marginLeft:'5px'}}>{message}</span>}
        <br />
        {meta.touched && meta.error &&
            <div className="Box-root Flex-flex Flex-alignItems--stretch Flex-direction--row Flex-justifyContent--flexStart" style={{marginTop:'5px'}}>
                <div className="Box-root Margin-right--8" style={{marginTop:'2px'}}>
                    <div className="Icon Icon--info Icon--color--red Icon--size--14 Box-root Flex-flex">
                    </div>
                </div>
                <div className="Box-root">
                    <span style={{ color: 'red' }}>
                        {meta.error}
                    </span>
                </div>
            </div>
        }
    </span>
)

RenderSelect.displayName = 'RenderSelect'

RenderSelect.propTypes = {
    input: PropTypes.object.isRequired,
    placeholder: PropTypes.string.isRequired,
    className: PropTypes.string,
    meta: PropTypes.object.isRequired,
    disabled: PropTypes.bool,
    style: PropTypes.object,
    children: PropTypes.string,
    message: PropTypes.string,
    id: PropTypes.string
}

export { RenderSelect }