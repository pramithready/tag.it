import React from 'react';
import ReactTags from 'react-tag-autocomplete';
import './style.css';

class AutocompleteTags extends React.Component {
    // constructor for component
    constructor(props) {
        super(props);

        // see package docs for additional options
        this.state = {
            tags: [],
            suggestions: [
                { id: 0, name: "midterms" },
                { id: 1, name: "final exam" },
                { id: 2, name: "logistics" },
                { id: 3, name: "quizzes" }
            ],
            delimiters: [9, 13, 32]
        };
    }

    handleDelete(i) {
        const tags = this.state.tags.slice(0);
        tags.splice(i, 1);
        this.setState({ tags });
    }

    handleAddition(tag) {
        const tags = [].concat(this.state.tags, tag);
        this.setState({ tags });
    }

    render() {
        return (
            <ReactTags
                tags={this.state.tags}
                suggestions={this.state.suggestions}
                handleDelete={this.handleDelete.bind(this)}
                handleAddition={this.handleAddition.bind(this)}
                allowNew={true}
                delimiters={this.state.delimiters}
                placeholder={this.props.placeholder} />
        );
    }
}

export default AutocompleteTags;