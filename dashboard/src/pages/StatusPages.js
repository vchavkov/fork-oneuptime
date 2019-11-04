import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Dashboard from '../components/Dashboard';
import StatusPagesTable from '../components/statusPage/StatusPagesTable'
import PropTypes from 'prop-types';
import ShouldRender from '../components/basic/ShouldRender';
import TutorialBox from '../components/tutorial/TutorialBox';

class StatusPage extends Component {

    componentDidMount() {
        if (window.location.href.indexOf('localhost') <= -1) {
            this.context.mixpanel.track('StatusPage Settings Loaded');
        }
    }

    render() {
        const { projectId } = this.props;

        return (
            <Dashboard>
                <ShouldRender if={this.props.statusPageTutorial.show}>
                    <TutorialBox type="status-page" />
                </ShouldRender>

                <StatusPagesTable projectId={projectId} />
            </Dashboard>
        );
    }
}


const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({}, dispatch);
};


function mapStateToProps(state, props) {
    const { projectId } = props.match.params;

    return {
        statusPage: state.statusPage,
        projectId,
        statusPageTutorial: state.tutorial.statusPage
    };
}

StatusPage.propTypes = {
    projectId: PropTypes.string.isRequired,
    statusPageTutorial: PropTypes.object
};

StatusPage.contextTypes = {
    mixpanel: PropTypes.object.isRequired
};

StatusPage.displayName = 'StatusPage';

export default connect(mapStateToProps, mapDispatchToProps)(StatusPage);